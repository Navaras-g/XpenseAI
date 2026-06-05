from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd

from backend.database.models import Transaction, Subscription, MonthlySummary, Category


def generate(user_id: str, target_month: date, db: Session) -> list[dict]:
    """
    Generate plain-language financial insights for a given month.
    target_month should be the first day of the month e.g. date(2024, 3, 1)
    """
    insights = []

    # ── Fetch monthly summaries ──────────────────────────────────────
    summaries = (
        db.query(MonthlySummary)
        .filter(MonthlySummary.user_id == user_id)
        .order_by(MonthlySummary.month)
        .all()
    )

    if not summaries:
        return []

    summary_df = pd.DataFrame([{
        "month": s.month,
        "income": float(s.income),
        "expenses": float(s.expenses),
        "savings": float(s.savings),
    } for s in summaries])

    current = summary_df[summary_df["month"] == target_month]
    if current.empty:
        return []

    current = current.iloc[0]
    prior_3 = summary_df[summary_df["month"] < target_month].tail(3)

    # ── FR: Savings rate low ─────────────────────────────────────────
    if current["income"] > 0:
        savings_rate = current["savings"] / current["income"]

        if savings_rate < 0:
            savings_display = f"overspent by {abs(current['savings']):.0f}"
        else:
            savings_display = f"saved {current['savings']:.0f}"

        if savings_rate < 0.10:
            insights.append({
                "type": "savings_rate_low",
                "severity": "alert",
                "message": (
                    f"Your savings rate this month is {savings_rate*100:.1f}% — "
                    f"below the recommended 10%. "
                    f"You {savings_display} against {current['income']:.0f} income."
                ),
                "related_category": None,
                "related_amount": float(current["savings"]),
            })
        elif savings_rate < 0.20:
            insights.append({
                "type": "savings_rate_low",
                "severity": "warning",
                "message": (
                    f"Your savings rate is {savings_rate*100:.1f}% this month. "
                    f"You {savings_display} against {current['income']:.0f} income. "
                    f"Aim for at least 20% to build a healthy financial cushion."
                ),
                "related_category": None,
                "related_amount": float(current["savings"]),
            })

    # ── FR: Monthly overspend vs last month ──────────────────────────
    if len(prior_3) >= 1:
        last_month_expenses = float(prior_3.iloc[-1]["expenses"])
        if last_month_expenses > 0 and current["expenses"] > last_month_expenses * 1.15:
            pct = ((current["expenses"] - last_month_expenses) / last_month_expenses) * 100
            insights.append({
                "type": "monthly_overspend",
                "severity": "warning",
                "message": (
                    f"You spent {pct:.1f}% more this month ({current['expenses']:.0f}) "
                    f"compared to last month ({last_month_expenses:.0f})."
                ),
                "related_category": None,
                "related_amount": float(current["expenses"]),
            })

    # ── FR: Income drop ──────────────────────────────────────────────
    if len(prior_3) >= 2:
        avg_income = prior_3["income"].mean()
        if avg_income > 0 and current["income"] < avg_income * 0.80:
            insights.append({
                "type": "income_drop",
                "severity": "alert",
                "message": (
                    f"Your income this month ({current['income']:.0f}) is significantly "
                    f"lower than your 3-month average ({avg_income:.0f}). "
                    f"Check for missing salary or income sources."
                ),
                "related_category": None,
                "related_amount": float(current["income"]),
            })

    # ── FR: No income detected ───────────────────────────────────────
    if current["income"] == 0:
        insights.append({
            "type": "no_income_detected",
            "severity": "warning",
            "message": (
                "No income was detected this month. "
                "If you received a salary or payment, check that it was categorized correctly."
            ),
            "related_category": None,
            "related_amount": 0,
        })

    # ── FR: Category-level changes ───────────────────────────────────
    month_start = target_month
    month_end = (target_month.replace(day=28) + timedelta(days=4)).replace(day=1)

    # Current month category spending
    current_cat = (
        db.query(Category.category_name, func.sum(func.abs(Transaction.amount)))
        .join(Transaction, Transaction.category_id == Category.category_id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        )
        .group_by(Category.category_name)
        .all()
    )
    current_cat_df = pd.DataFrame(current_cat, columns=["category", "amount"])
    current_cat_df["amount"] = current_cat_df["amount"].astype(float)

    # Prior 3 months category spending average
    prior_start = (target_month - timedelta(days=90))
    prior_cat = (
        db.query(Category.category_name, func.sum(func.abs(Transaction.amount)))
        .join(Transaction, Transaction.category_id == Category.category_id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.date >= prior_start,
            Transaction.date < month_start,
        )
        .group_by(Category.category_name)
        .all()
    )
    prior_cat_df = pd.DataFrame(prior_cat, columns=["category", "amount"])
    prior_cat_df["amount"] = prior_cat_df["amount"].astype(float) / 3  # monthly average

    merged = current_cat_df.merge(prior_cat_df, on="category", suffixes=("_now", "_avg"))

    for _, row in merged.iterrows():
        if row["amount_avg"] < 100:
            continue  # ignore tiny categories

        change = (row["amount_now"] - row["amount_avg"]) / row["amount_avg"]

        if change > 0.20:
            insights.append({
                "type": "category_increase",
                "severity": "warning" if change > 0.50 else "info",
                "message": (
                    f"You spent {change*100:.0f}% more on {row['category']} this month "
                    f"({row['amount_now']:.0f}) compared to your 3-month average "
                    f"({row['amount_avg']:.0f})."
                ),
                "related_category": row["category"],
                "related_amount": float(row["amount_now"]),
            })
        elif change < -0.30:
            insights.append({
                "type": "category_decrease",
                "severity": "info",
                "message": (
                    f"Great — you spent {abs(change)*100:.0f}% less on {row['category']} "
                    f"this month ({row['amount_now']:.0f} vs average {row['amount_avg']:.0f})."
                ),
                "related_category": row["category"],
                "related_amount": float(row["amount_now"]),
            })

    # ── FR: Largest transactions this month ──────────────────────────
    largest = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "debit",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        )
        .order_by(Transaction.amount)
        .limit(3)
        .all()
    )
    for txn in largest:
        insights.append({
            "type": "largest_transaction",
            "severity": "info",
            "message": (
                f"One of your largest expenses this month: "
                f"{txn.merchant} — {abs(float(txn.amount)):.0f}."
            ),
            "related_category": None,
            "related_amount": abs(float(txn.amount)),
        })

    # ── FR: Subscription reminders ───────────────────────────────────
    upcoming = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.next_expected_date >= date.today(),
            Subscription.next_expected_date <= date.today() + timedelta(days=7),
        )
        .all()
    )
    for sub in upcoming:
        days_away = (sub.next_expected_date - date.today()).days
        insights.append({
            "type": "subscription_reminder",
            "severity": "info",
            "message": (
                f"{sub.merchant} is due in {days_away} day(s) — "
                f"expected charge of {float(sub.amount):.0f}."
            ),
            "related_category": "Subscriptions",
            "related_amount": float(sub.amount),
        })

    # Sort by severity: alert first, then warning, then info
    severity_order = {"alert": 0, "warning": 1, "info": 2}
    insights.sort(key=lambda x: severity_order.get(x["severity"], 3))

    # Add generated_at timestamp
    now = datetime.now().isoformat()
    for insight in insights:
        insight["generated_at"] = now

    return insights