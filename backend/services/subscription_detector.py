import pandas as pd
import numpy as np
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.database.models import Transaction, Subscription


FREQUENCY_RULES = [
    (6,   8,   "weekly"),
    (13,  16,  "biweekly"),
    (25,  35,  "monthly"),
    (55,  70,  "bimonthly"),
    (85,  100, "quarterly"),
    (350, 380, "annual"),
]


def _classify_frequency(mean_interval: float) -> str:
    for low, high, label in FREQUENCY_RULES:
        if low <= mean_interval <= high:
            return label
    return "irregular"


def _predict_next_date(last_date: date, mean_interval: float) -> date:
    return last_date + timedelta(days=round(mean_interval))


NON_SUBSCRIPTION_KEYWORDS = [
    "SWIGGY", "ZOMATO", "FOODMANDU", "UBER", "PATHAO", "OLA",
    "INDRIVE", "PETROL", "FUEL", "PHARMACY", "MEDICAL", "CINEMA",
    "QFX", "BOOKMYSHOW", "RESTAURANT", "CAFE", "GROCERY",
    "BHATBHATENI", "DARAZ", "AMAZON", "FLIPKART", "KHALTI",
    "ESEWA", "ATM", "CASH",
]


def detect(user_id: str, db: Session) -> dict:
    rows = db.query(
        Transaction.merchant,
        Transaction.amount,
        Transaction.date,
    ).filter(
        Transaction.user_id == user_id,
        Transaction.transaction_type == "debit",
    ).order_by(Transaction.date).all()

    if not rows:
        return {"detected": 0, "updated": 0}

    df = pd.DataFrame(rows, columns=["merchant", "amount", "date"])
    df["amount"] = df["amount"].astype(float).abs()
    df["date"] = pd.to_datetime(df["date"])

    detected = 0
    updated = 0

    for merchant, group in df.groupby("merchant"):
        group = group.sort_values("date").reset_index(drop=True)

        if len(group) < 2:
            continue

        # ── Skip known non-subscription merchants ────────────────
        if any(kw in merchant.upper() for kw in NON_SUBSCRIPTION_KEYWORDS):
            continue

        # ── Amount consistency check ─────────────────────────────
        median_amount = group["amount"].median()
        consistent = group[
            (group["amount"] >= median_amount * 0.80) &
            (group["amount"] <= median_amount * 1.20)
        ]

        if len(consistent) < 3:
            continue

        # ── Interval analysis ────────────────────────────────────
        dates = consistent["date"].sort_values().reset_index(drop=True)
        intervals = dates.diff().dropna().dt.days.tolist()

        if not intervals:
            continue

        mean_interval = np.mean(intervals)
        std_interval = np.std(intervals)

        if std_interval > 5 and (std_interval / mean_interval) > 0.20:
            continue

        frequency = _classify_frequency(mean_interval)

        if frequency == "irregular" and len(consistent) < 4:
            continue

        last_date = dates.iloc[-1].date()
        next_date = _predict_next_date(last_date, mean_interval)
        typical_amount = round(float(median_amount), 2)

        existing = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.merchant == merchant,
        ).first()

        days_since_last = (date.today() - last_date).days
        is_active = days_since_last <= (mean_interval * 1.5)

        if existing:
            existing.amount = typical_amount
            existing.frequency = frequency
            existing.last_seen_date = last_date
            existing.next_expected_date = next_date
            existing.is_active = is_active
            updated += 1
        else:
            db.add(Subscription(
                user_id=user_id,
                merchant=merchant,
                amount=typical_amount,
                frequency=frequency,
                last_seen_date=last_date,
                next_expected_date=next_date,
                is_active=is_active,
            ))
            detected += 1

    db.commit()
    return {"detected": detected, "updated": updated}