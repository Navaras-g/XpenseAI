from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from backend.database.models import Transaction, Anomaly, Subscription, MonthlySummary


def compute(user_id: str, target_month: date, db: Session) -> dict:
    """
    Compute a 0-100 financial health score for a given month.
    Four components, each worth 0-25 points.
    """
    month_start = target_month
    month_end = (target_month.replace(day=28) + timedelta(days=4)).replace(day=1)

    # ── Fetch monthly summary ────────────────────────────────────────
    summary = (
        db.query(MonthlySummary)
        .filter(
            MonthlySummary.user_id == user_id,
            MonthlySummary.month == month_start,
        )
        .first()
    )

    if not summary:
        return {
            "score": None,
            "components": {},
            "summary": "No data available for this month.",
        }

    income = float(summary.income)
    expenses = float(summary.expenses)
    savings = float(summary.savings)

    components = {}

    # ── Component 1: Savings Rate (0-25) ────────────────────────────
    # Full 25 pts at >= 20% savings rate, scales down to 0 at 0% or negative
    if income > 0:
        savings_rate = savings / income
        savings_score = min(25, max(0, (savings_rate / 0.20) * 25))
    else:
        savings_score = 0

    components["savings_rate"] = {
        "score": round(savings_score, 1),
        "max": 25,
        "detail": (
            f"Savings rate: {(savings/income*100):.1f}%" if income > 0
            else "No income recorded"
        ),
    }

    # ── Component 2: Spending Consistency (0-25) ────────────────────
    # Low week-to-week variance = high score
    txns = (
        db.query(Transaction.date, Transaction.amount)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        )
        .all()
    )

    if txns:
        df = pd.DataFrame(txns, columns=["date", "amount"])
        df["amount"] = df["amount"].astype(float).abs()
        df["week"] = pd.to_datetime(df["date"]).dt.isocalendar().week
        weekly = df.groupby("week")["amount"].sum()

        if len(weekly) > 1:
            cv = weekly.std() / weekly.mean()  # coefficient of variation
            # cv=0 → 25 pts, cv=1 → 0 pts
            consistency_score = min(25, max(0, (1 - cv) * 25))
        else:
            consistency_score = 20  # only one week of data — give benefit of doubt
    else:
        consistency_score = 0

    components["spending_consistency"] = {
        "score": round(consistency_score, 1),
        "max": 25,
        "detail": "Based on week-to-week spending variance this month.",
    }

    # ── Component 3: Anomaly Burden (0-25) ──────────────────────────
    # Start at 25, deduct 5 per anomaly, floor at 0
    anomaly_count = (
        db.query(func.count(Anomaly.anomaly_id))
        .join(Transaction, Anomaly.transaction_id == Transaction.transaction_id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= month_start,
            Transaction.date < month_end,
            Anomaly.is_anomaly == True,
        )
        .scalar() or 0
    )

    anomaly_score = max(0, 25 - (anomaly_count * 5))

    components["anomaly_burden"] = {
        "score": round(anomaly_score, 1),
        "max": 25,
        "detail": (
            f"{anomaly_count} anomalous transaction(s) detected this month."
            if anomaly_count > 0
            else "No anomalous transactions this month."
        ),
    }

    # ── Component 4: Subscription Burden (0-25) ─────────────────────
    # Subscriptions < 15% of expenses = full 25 pts
    # Scales down to 0 at 40%+ of expenses
    active_subs = (
        db.query(func.sum(Subscription.amount))
        .filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.frequency == "monthly",
        )
        .scalar() or 0
    )
    total_sub_spend = float(active_subs)

    if expenses > 0:
        sub_ratio = total_sub_spend / expenses
        # Full score at <= 15%, zero at >= 40%
        if sub_ratio <= 0.15:
            sub_score = 25
        elif sub_ratio >= 0.40:
            sub_score = 0
        else:
            sub_score = 25 * (1 - (sub_ratio - 0.15) / 0.25)
    else:
        sub_score = 25

    components["subscription_burden"] = {
        "score": round(sub_score, 1),
        "max": 25,
        "detail": (
            f"Monthly subscriptions total {total_sub_spend:.0f} "
            f"({(total_sub_spend/expenses*100):.1f}% of expenses)."
            if expenses > 0 else "No expense data."
        ),
    }

    # ── Total score ──────────────────────────────────────────────────
    total = savings_score + consistency_score + anomaly_score + sub_score
    total = round(min(100, max(0, total)), 1)

    # ── Plain-language summary ───────────────────────────────────────
    summary_text = _generate_summary(total, components, savings, income)

    # ── Persist health score into monthly_summaries ──────────────────
    summary.health_score = float(total)
    db.commit()

    return {
        "score": total,
        "components": components,
        "summary": summary_text,
        "month": str(month_start),
    }


def _generate_summary(score: float, components: dict, savings: float, income: float) -> str:
    if score >= 80:
        return (
            f"Excellent financial health this month (score: {score}). "
            f"You're saving well and spending consistently."
        )
    elif score >= 60:
        weakest = min(components, key=lambda k: components[k]["score"])
        label = weakest.replace("_", " ").title()
        return (
            f"Good financial health (score: {score}). "
            f"Your weakest area is {label} — focus here to improve your score."
        )
    elif score >= 40:
        weakest = min(components, key=lambda k: components[k]["score"])
        label = weakest.replace("_", " ").title()
        return (
            f"Fair financial health (score: {score}). "
            f"{label} is dragging your score down significantly. "
            f"Review your spending in this area."
        )
    else:
        return (
            f"Your financial health needs attention this month (score: {score}). "
            f"Focus on reducing expenses and building consistent saving habits."
        )