import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, format_currency

require_auth()

st.title("📂 Category Analytics")

# ── Fetch all transactions ───────────────────────────────────────────
result = api_get("/transactions", params={"limit": 500})

if not result or not result.get("data"):
    st.info("No transaction data available. Upload a CSV first.")
    st.stop()

df = pd.DataFrame(result["data"])
df["date"] = pd.to_datetime(df["date"])
df["amount_abs"] = df["amount"].abs()
df["month"] = df["date"].dt.to_period("M").astype(str)

expense_df = df[df["transaction_type"] == "debit"].copy()

# ── Monthly spend per category ───────────────────────────────────────
st.subheader("Monthly Spend by Category")

monthly_cat = (
    expense_df.groupby(["month", "category"])["amount_abs"]
    .sum()
    .reset_index()
    .pivot(index="month", columns="category", values="amount_abs")
    .fillna(0)
)

st.bar_chart(monthly_cat)

st.divider()

# ── Category deep dive ───────────────────────────────────────────────
st.subheader("Category Deep Dive")

categories = sorted(expense_df["category"].dropna().unique().tolist())
selected_cat = st.selectbox("Select a category", categories)

cat_df = expense_df[expense_df["category"] == selected_cat]

if cat_df.empty:
    st.info(f"No transactions in {selected_cat}.")
else:
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Spent", format_currency(cat_df["amount_abs"].sum()))
    col2.metric("Avg per Transaction", format_currency(cat_df["amount_abs"].mean()))
    col3.metric("Transaction Count", len(cat_df))

    # Monthly trend
    monthly_trend = cat_df.groupby("month")["amount_abs"].sum().reset_index()
    monthly_trend.columns = ["Month", "Amount"]
    st.line_chart(monthly_trend.set_index("Month"))

    # Top merchants
    st.subheader(f"Top Merchants in {selected_cat}")
    top_merchants = (
        cat_df.groupby("merchant")["amount_abs"]
        .sum()
        .sort_values(ascending=False)
        .head(10)
        .reset_index()
    )
    top_merchants.columns = ["Merchant", "Total Spent"]
    top_merchants["Total Spent"] = top_merchants["Total Spent"].apply(
        lambda x: f"NPR {x:,.0f}"
    )
    st.dataframe(top_merchants, use_container_width=True, hide_index=True)

st.divider()

# ── Day of week heatmap ──────────────────────────────────────────────
st.subheader("Spending by Day of Week")

expense_df["day_of_week"] = expense_df["date"].dt.day_name()
day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

day_spend = (
    expense_df.groupby(["day_of_week", "category"])["amount_abs"]
    .sum()
    .reset_index()
    .pivot(index="day_of_week", columns="category", values="amount_abs")
    .fillna(0)
    .reindex(day_order)
)

st.bar_chart(day_spend)