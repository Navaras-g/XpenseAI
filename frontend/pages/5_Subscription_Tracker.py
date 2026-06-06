import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, api_post, format_currency

require_auth()

st.title("🔄 Subscription Tracker")

# ── Run detection ────────────────────────────────────────────────────
col_refresh, _ = st.columns([1, 3])
with col_refresh:
    if st.button("🔍 Re-detect Subscriptions"):
        with st.spinner("Detecting..."):
            result = api_post("/subscriptions/detect")
        if result and result.get("success"):
            d = result["data"]
            st.success(f"Found {d['detected']} new, updated {d['updated']} existing.")
            st.rerun()

# ── Fetch subscriptions ──────────────────────────────────────────────
result = api_get("/subscriptions")

if not result or not result.get("data"):
    st.info("No subscriptions detected yet. Upload more transaction history to improve detection.")
    st.stop()

subs = result["data"]
df = pd.DataFrame(subs)
df["amount"] = df["amount"].astype(float)
df["next_expected_date"] = pd.to_datetime(df["next_expected_date"])

active = df[df["is_active"] == True]
inactive = df[df["is_active"] == False]

# ── Summary metrics ──────────────────────────────────────────────────
monthly_total = active["amount"].sum() if not active.empty else 0
annual_total = monthly_total * 12

col1, col2, col3 = st.columns(3)
col1.metric("Active Subscriptions", len(active))
col2.metric("Monthly Total", format_currency(monthly_total))
col3.metric("Annual Projected", format_currency(annual_total))

st.divider()

# ── Active subscriptions ─────────────────────────────────────────────
st.subheader("Active Subscriptions")

if active.empty:
    st.info("No active subscriptions found.")
else:
    display = active[["merchant", "amount", "frequency", "last_seen_date", "next_expected_date"]].copy()
    display["amount"] = display["amount"].apply(lambda x: f"NPR {x:,.0f}")
    display["next_expected_date"] = pd.to_datetime(display["next_expected_date"]).dt.strftime("%Y-%m-%d")
    display["last_seen_date"] = pd.to_datetime(display["last_seen_date"]).dt.strftime("%Y-%m-%d")
    display.columns = ["Merchant", "Amount", "Frequency", "Last Charged", "Next Expected"]
    st.dataframe(display, use_container_width=True, hide_index=True)

st.divider()

# ── Inactive subscriptions ───────────────────────────────────────────
if not inactive.empty:
    with st.expander(f"Inactive / Cancelled ({len(inactive)})"):
        display_in = inactive[["merchant", "amount", "frequency", "last_seen_date"]].copy()
        display_in["amount"] = display_in["amount"].apply(lambda x: f"NPR {x:,.0f}")
        display_in.columns = ["Merchant", "Amount", "Frequency", "Last Seen"]
        st.dataframe(display_in, use_container_width=True, hide_index=True)