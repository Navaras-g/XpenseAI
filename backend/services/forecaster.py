import pandas as pd
import numpy as np
from datetime import date
from sqlalchemy.orm import Session
from sklearn.linear_model import LinearRegression

from backend.database.models import Transaction, Category


def _get_next_month(target_month: date) -> date:
    if target_month.month == 12:
        return date(target_month.year + 1, 1, 1)
    return date(target_month.year, target_month.month + 1, 1)


def _moving_average(values: list[float], n: int = 3) -> float:
    return float(np.mean(values[-n:]))


def _linear_regression_forecast(monthly_amounts: list[float]) -> float:
    X = np.array(range(len(monthly_amounts))).reshape(-1, 1)
    y = np.array(monthly_amounts)
    model = LinearRegression()
    model.fit(X, y)
    next_x = np.array([[len(monthly_amounts)]])
    predicted = model.predict(next_x)[0]
    return max(0.0, float(predicted))  # spending can't be negative


def forecast(user_id: str, db: Session, months_ahead: int = 1) -> list[dict]:
    """
    Forecast spending per category for the next N months.
    Uses Linear Regression for categories with 6+ months of data,
    Moving Average for 3-5 months, and returns null for < 3 months.
    """
    # ── Fetch all debit transactions ─────────────────────────────────
    rows = (
        db.query(
            Transaction.date,
            Transaction.amount,
            Category.category_name,
        )
        .join(Category, Transaction.category_id == Category.category_id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
            Category.is_income == False,
        )
        .all()
    )

    if not rows:
        return []

    df = pd.DataFrame(rows, columns=["date", "amount", "category"])
    df["amount"] = df["amount"].astype(float).abs()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    # ── Monthly totals per category ──────────────────────────────────
    monthly = (
        df.groupby(["category", "month"])["amount"]
        .sum()
        .reset_index()
        .sort_values("month")
    )

    # Determine the latest month in data
    latest_month = df["month"].max()

    results = []

    for category, group in monthly.groupby("category"):
        group = group.sort_values("month").reset_index(drop=True)
        amounts = group["amount"].tolist()
        months = group["month"].tolist()
        n = len(amounts)

        forecasts_for_category = []

        for step in range(1, months_ahead + 1):
            target = latest_month + step
            target_date = target.to_timestamp().date()

            if n < 3:
                forecasts_for_category.append({
                    "month": str(target_date),
                    "category": category,
                    "predicted_amount": None,
                    "method": None,
                    "confidence": "low",
                    "trend": None,
                    "note": "Not enough data — need at least 3 months.",
                })
                continue

            if n >= 6:
                predicted = _linear_regression_forecast(amounts)
                method = "linear_regression"
                confidence = "high"
            else:
                predicted = _moving_average(amounts, n=3)
                method = "moving_average"
                confidence = "medium"

            # ── Trend detection ──────────────────────────────────────
            if len(amounts) >= 3:
                recent_avg = np.mean(amounts[-3:])
                older_avg = np.mean(amounts[:-3]) if len(amounts) > 3 else amounts[0]
                change = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
                if change > 0.10:
                    trend = "increasing"
                elif change < -0.10:
                    trend = "decreasing"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            forecasts_for_category.append({
                "month": str(target_date),
                "category": category,
                "predicted_amount": round(predicted, 2),
                "method": method,
                "confidence": confidence,
                "trend": trend,
                "note": None,
            })

        results.extend(forecasts_for_category)

    # Sort by month then predicted amount descending
    results.sort(key=lambda x: (x["month"], -(x["predicted_amount"] or 0)))

    return results


def forecast_total(user_id: str, db: Session, months_ahead: int = 1) -> list[dict]:
    """
    Forecast total spending (all categories combined) for the next N months.
    """
    rows = (
        db.query(Transaction.date, Transaction.amount)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
        )
        .all()
    )

    if not rows:
        return []

    df = pd.DataFrame(rows, columns=["date", "amount"])
    df["amount"] = df["amount"].astype(float).abs()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    monthly_totals = (
        df.groupby("month")["amount"]
        .sum()
        .sort_index()
    )

    amounts = monthly_totals.tolist()
    latest_month = monthly_totals.index[-1]
    n = len(amounts)

    results = []

    for step in range(1, months_ahead + 1):
        target = latest_month + step
        target_date = target.to_timestamp().date()

        if n < 3:
            results.append({
                "month": str(target_date),
                "predicted_total": None,
                "method": None,
                "confidence": "low",
                "note": "Not enough data.",
            })
            continue

        if n >= 6:
            predicted = _linear_regression_forecast(amounts)
            method = "linear_regression"
            confidence = "high"
        else:
            predicted = _moving_average(amounts, n=3)
            method = "moving_average"
            confidence = "medium"

        results.append({
            "month": str(target_date),
            "predicted_total": round(predicted, 2),
            "method": method,
            "confidence": confidence,
            "note": None,
        })

    return results