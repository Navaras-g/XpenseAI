import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, api_post, api_patch, format_currency

require_auth()

st.title("💳 Transactions")

# ── CSV Upload ───────────────────────────────────────────────────────
with st.expander("📤 Upload New CSV", expanded=False):
    uploaded = st.file_uploader("Choose a CSV file", type=["csv"])
    if uploaded and st.button("Upload & Process"):
        with st.spinner("Processing..."):
            result = api_post(
                "/upload-transactions",
                files={"file": (uploaded.name, uploaded.getvalue(), "text/csv")},
            )
        if result and result.get("success"):
            d = result["data"]
            st.success(f"✅ Imported {d['inserted']} transactions. Skipped {d['skipped_duplicates']} duplicates.")
            if d["warnings"]:
                for w in d["warnings"]:
                    st.warning(w)
            st.rerun()
        else:
            st.error("Upload failed.")

st.divider()

# ── Filters ──────────────────────────────────────────────────────────
st.subheader("Filter Transactions")
col1, col2, col3 = st.columns(3)

with col1:
    start_date = st.date_input("From", value=None, key="txn_start")
with col2:
    end_date = st.date_input("To", value=None, key="txn_end")
with col3:
    search = st.text_input("Search merchant", key="txn_search")

# ── Fetch transactions ───────────────────────────────────────────────
params = {"limit": 200}
if start_date:
    params["start_date"] = str(start_date)
if end_date:
    params["end_date"] = str(end_date)

result = api_get("/transactions", params=params)

if not result or not result.get("data"):
    st.info("No transactions found. Upload a CSV to get started.")
    st.stop()

df = pd.DataFrame(result["data"])

# Apply merchant search filter client-side
if search:
    df = df[df["merchant"].str.contains(search.upper(), case=False, na=False)]

st.caption(f"Showing {len(df)} of {result['total']} transactions")

# ── Display table ────────────────────────────────────────────────────
st.subheader("Transactions")

# Format for display
display_df = df[["date", "merchant", "amount", "transaction_type", "category", "is_user_corrected"]].copy()
display_df["amount"] = display_df["amount"].apply(lambda x: f"NPR {abs(x):,.0f}")
display_df.columns = ["Date", "Merchant", "Amount", "Type", "Category", "Corrected"]

st.dataframe(display_df, use_container_width=True, hide_index=True)

# ── Category correction ──────────────────────────────────────────────
st.divider()
st.subheader("✏️ Correct a Category")
st.caption("Select a transaction and assign the correct category. Corrections improve the ML model.")

# Fetch categories
cats_result = api_get("/transactions")  # We'll get categories from a transaction
all_categories = {
    "Food & Dining": 1, "Transport": 2, "Utilities": 3, "Shopping": 4,
    "Entertainment": 5, "Health": 6, "Subscriptions": 7, "Education": 8,
    "Travel": 9, "Rent & Housing": 10, "Insurance": 11, "Transfers": 12,
    "Other Expense": 13, "Salary": 14, "Freelance": 15, "Other Income": 16,
}

col_a, col_b, col_c = st.columns([2, 2, 1])

with col_a:
    merchant_options = df["merchant"].unique().tolist()
    selected_merchant = st.selectbox("Select Merchant", merchant_options, key="correct_merchant")

with col_b:
    selected_category = st.selectbox("Assign Category", list(all_categories.keys()), key="correct_cat")

with col_c:
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("Apply", use_container_width=True):
        matching = df[df["merchant"] == selected_merchant]
        if not matching.empty:
            txn_id = matching.iloc[0]["transaction_id"]
            cat_id = all_categories[selected_category]
            res = api_patch(f"/transactions/{txn_id}/category", params={"category_id": cat_id})
            if res and res.get("success"):
                st.success(f"Updated {selected_merchant} → {selected_category}")
                st.rerun()
            else:
                st.error("Update failed.")

# ── Export ───────────────────────────────────────────────────────────
st.divider()
csv = display_df.to_csv(index=False)
st.download_button("⬇️ Export to CSV", csv, "transactions.csv", "text/csv")