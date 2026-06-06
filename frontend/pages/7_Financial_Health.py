import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, format_currency, month_selector

require_auth()

st.title("❤️ Financial Health")

month = month_selector("Select Month", key="health_month")

result = api_get("/dashboard-summary", params={"month": month})

if not result or not result.get("data"):
    st.info("No data for this month.")
    st.stop()

data = result["data"]
score = data["health_score"]
components = data["health_components"]
summary_text = data["health_summary"]

# ── Score display ────────────────────────────────────────────────────
st.subheader(f"Health Score — {month}")

score_color = "🟢" if score >= 70 else "🟡" if score >= 40 else "🔴"
st.markdown(f"## {score_color} {score} / 100")
st.caption(summary_text)

# Score bar
st.progress(int(score))

st.divider()

# ── Component breakdown ──────────────────────────────────────────────
st.subheader("Score Breakdown")

for key, val in components.items():
    label = key.replace("_", " ").title()
    score_val = val["score"]
    max_val = val["max"]
    pct = int((score_val / max_val) * 100)

    col1, col2 = st.columns([3, 1])
    with col1:
        color = "🟢" if pct >= 70 else "🟡" if pct >= 40 else "🔴"
        st.markdown(f"{color} **{label}**")
        st.progress(pct)
        st.caption(val["detail"])
    with col2:
        st.metric("Points", f"{score_val}/{max_val}")

st.divider()

# ── Historical scores ────────────────────────────────────────────────
st.subheader("Health Score Over Time")

from utils import api_get as get
summaries_jan = get("/dashboard-summary", params={"month": "2024-01"})
summaries_feb = get("/dashboard-summary", params={"month": "2024-02"})
summaries_mar = get("/dashboard-summary", params={"month": "2024-03"})

history = []
for s in [summaries_jan, summaries_feb, summaries_mar]:
    if s and s.get("data") and s["data"].get("health_score"):
        history.append({
            "Month": s["data"]["month"],
            "Score": s["data"]["health_score"],
        })

if history:
    hist_df = pd.DataFrame(history).set_index("Month")
    st.line_chart(hist_df)
else:
    st.info("Not enough historical data for trend chart.")

st.divider()

# ── Improvement tips ─────────────────────────────────────────────────
st.subheader("💡 How to Improve Your Score")

tips = {
    "savings_rate": "Increase your savings rate by reducing discretionary spending like dining out and entertainment.",
    "spending_consistency": "Try to spread your spending evenly across the month rather than large spikes.",
    "anomaly_burden": "Review flagged transactions in the Anomaly Center — unexpected charges may indicate errors or fraud.",
    "subscription_burden": "Audit your subscriptions in the Subscription Tracker and cancel unused ones.",
}

for key, tip in tips.items():
    label = key.replace("_", " ").title()
    comp = components.get(key, {})
    score_val = comp.get("score", 0)
    max_val = comp.get("max", 25)
    pct = (score_val / max_val) * 100

    if pct < 70:
        st.markdown(f"**{label}:** {tip}")