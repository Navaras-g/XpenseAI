import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

import streamlit as st
import pandas as pd
from utils import require_auth, api_get, format_currency

require_auth()

st.title("🔮 Forecasting")

months_ahead = st.slider("Months to forecast", min_value=1, max_value=3, value=1)

result = api_get("/forecast", params={"months_ahead": months_ahead})

if not result or not result.get("data"):
    st.info("Not enough data to generate forecasts. Upload at least 3 months of transactions.")
    st.stop()

data = result["data"]
cat_forecasts = data["category_forecasts"]
total_forecasts = data["total_forecasts"]

# ── Total forecast ───────────────────────────────────────────────────
st.subheader("Predicted Total Spending")

for t in total_forecasts:
    col1, col2, col3 = st.columns(3)
    col1.metric("Month", t["month"])
    col2.metric(
        "Predicted Total",
        format_currency(t["predicted_total"]) if t["predicted_total"] else "N/A"
    )
    col3.metric("Confidence", t["confidence"].title() if t["confidence"] else "N/A")

st.divider()

# ── Category forecasts ───────────────────────────────────────────────
st.subheader("Predicted Spend by Category")

df = pd.DataFrame(cat_forecasts)
df = df[df["predicted_amount"].notna()]

if df.empty:
    st.info("Not enough category-level data for forecasts.")
    st.stop()

# Group by month
for month in df["month"].unique():
    st.markdown(f"#### {month}")
    month_df = df[df["month"] == month].sort_values("predicted_amount", ascending=False)

    for _, row in month_df.iterrows():
        trend_icon = "📈" if row["trend"] == "increasing" else "📉" if row["trend"] == "decreasing" else "➡️"
        confidence_color = "🟢" if row["confidence"] == "high" else "🟡" if row["confidence"] == "medium" else "🔴"
        st.markdown(
            f"{trend_icon} **{row['category']}** — {format_currency(row['predicted_amount'])} "
            f"&nbsp; {confidence_color} {row['confidence']} confidence &nbsp; "
            f"*({row['method'].replace('_', ' ')})*"
        )

st.divider()

# ── Bar chart ────────────────────────────────────────────────────────
st.subheader("Forecast Chart")
first_month = df[df["month"] == df["month"].min()]
chart_df = first_month.set_index("category")["predicted_amount"]
st.bar_chart(chart_df)