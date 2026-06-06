import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
from utils import require_auth, api_get, format_currency, month_selector

require_auth()

st.title("📊 Overview")

# ── Month selector ───────────────────────────────────────────────────
month = month_selector("Select Month", key="overview_month")

# ── Fetch dashboard summary ──────────────────────────────────────────
summary = api_get("/dashboard-summary", params={"month": month})

if not summary or not summary.get("data"):
    st.info("No data for this month. Upload a CSV from the Transactions page.")
    st.stop()

data = summary["data"]

# ── KPI row ──────────────────────────────────────────────────────────
st.subheader("This Month at a Glance")
col1, col2, col3, col4 = st.columns(4)

col1.metric("Income", format_currency(data["income"]))
col2.metric("Expenses", format_currency(data["expenses"]))

savings = data["savings"]
col3.metric(
    "Savings",
    format_currency(abs(savings)),
    delta=f"{'Overspent' if savings < 0 else 'Saved'}",
    delta_color="inverse" if savings < 0 else "normal",
)
col4.metric("Health Score", f"{data['health_score']} / 100")

st.divider()

# ── Two column layout ────────────────────────────────────────────────
left, right = st.columns([1.2, 1])

with left:
    # ── Category breakdown ───────────────────────────────────────────
    st.subheader("Spending by Category")
    if data["top_categories"]:
        import pandas as pd
        cat_df = pd.DataFrame(data["top_categories"])
        st.bar_chart(cat_df.set_index("category")["amount"])
    else:
        st.info("No category data available.")

with right:
    # ── Health score breakdown ───────────────────────────────────────
    st.subheader("Health Score Breakdown")
    components = data.get("health_components", {})
    for key, val in components.items():
        label = key.replace("_", " ").title()
        score = val["score"]
        max_score = val["max"]
        pct = int((score / max_score) * 100)
        color = "🟢" if pct >= 70 else "🟡" if pct >= 40 else "🔴"
        st.markdown(f"{color} **{label}**: {score}/{max_score}")
        st.progress(pct)
        st.caption(val["detail"])

st.divider()

# ── Insights strip ───────────────────────────────────────────────────
st.subheader("💡 Top Insights")
insights = api_get("/insights", params={"month": month})

if insights and insights.get("data"):
    top = insights["data"][:4]
    for insight in top:
        icon = "🚨" if insight["severity"] == "alert" else "⚠️" if insight["severity"] == "warning" else "ℹ️"
        st.markdown(f"{icon} {insight['message']}")
else:
    st.info("No insights available for this month.")

st.divider()

# ── Anomaly and transaction summary ─────────────────────────────────
col_a, col_b = st.columns(2)

with col_a:
    st.subheader("🚨 Anomalies")
    count = data.get("anomaly_count", 0)
    if count > 0:
        st.warning(f"{count} anomalous transaction(s) detected this month.")
        if st.button("View Anomalies"):
            st.switch_page("pages/4_Anomaly_Center.py")
    else:
        st.success("No anomalies detected this month.")

with col_b:
    st.subheader("📋 Transactions")
    st.info(f"{data.get('transaction_count', 0)} transactions recorded this month.")
    if st.button("View Transactions"):
        st.switch_page("pages/2_Transactions.py")