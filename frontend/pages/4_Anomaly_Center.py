import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, format_currency

require_auth()

st.title("🚨 Anomaly Center")

# ── Fetch anomalies ──────────────────────────────────────────────────
result = api_get("/anomalies", params={"is_anomaly": "true"})

if not result:
    st.stop()

anomalies = result.get("data", [])
count = result.get("count", 0)

if count == 0:
    st.success("✅ No anomalies detected in your transaction history.")
    st.stop()

st.warning(f"⚠️ {count} anomalous transaction(s) detected.")

# ── Summary metrics ──────────────────────────────────────────────────
df = pd.DataFrame(anomalies)
df["date"] = pd.to_datetime(df["date"])
df["amount"] = df["amount"].astype(float)

col1, col2, col3 = st.columns(3)
col1.metric("Total Anomalies", count)
col2.metric("Total Anomalous Spend", format_currency(df["amount"].sum()))
col3.metric("Highest Amount", format_currency(df["amount"].max()))

st.divider()

# ── Anomaly table ────────────────────────────────────────────────────
st.subheader("Flagged Transactions")

display = df[["date", "merchant", "amount", "anomaly_score", "reason"]].copy()
display["date"] = display["date"].dt.strftime("%Y-%m-%d")
display["amount"] = display["amount"].apply(lambda x: f"NPR {x:,.0f}")
display["anomaly_score"] = display["anomaly_score"].apply(lambda x: f"{x:.4f}")
display.columns = ["Date", "Merchant", "Amount", "Anomaly Score", "Reason"]

st.dataframe(display, use_container_width=True, hide_index=True)

st.divider()

# ── Scatter plot ─────────────────────────────────────────────────────
st.subheader("Amount Distribution")
st.caption("Anomalous transactions vs normal spending range")

all_txns = api_get("/transactions", params={"limit": 200})
if all_txns and all_txns.get("data"):
    all_df = pd.DataFrame(all_txns["data"])
    all_df["amount_abs"] = all_df["amount"].abs()
    all_df["is_anomaly"] = all_df["transaction_id"].isin(df["transaction_id"].tolist())

    normal = all_df[~all_df["is_anomaly"]][["merchant", "amount_abs"]].copy()
    normal["type"] = "Normal"
    flagged = all_df[all_df["is_anomaly"]][["merchant", "amount_abs"]].copy()
    flagged["type"] = "Anomaly"

    combined = pd.concat([normal, flagged])
    combined.columns = ["Merchant", "Amount", "Type"]

    anomaly_only = combined[combined["Type"] == "Anomaly"]
    st.bar_chart(anomaly_only.set_index("Merchant")["Amount"])