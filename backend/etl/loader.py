import uuid
from sqlalchemy.orm import Session
from backend.database.models import Transaction, MonthlySummary
import pandas as pd


def load(df: pd.DataFrame, user_id: str, db: Session) -> dict:
    if df.empty:
        return {"inserted": 0, "skipped_duplicates": 0}

    existing_hashes = set(
        row[0] for row in
        db.query(Transaction.raw_hash)
        .filter(Transaction.user_id == user_id)
        .all()
    )

    inserted = 0
    skipped_duplicates = 0
    new_transactions = []

    for _, row in df.iterrows():
        if row["raw_hash"] in existing_hashes:
            skipped_duplicates += 1
            continue

        txn = Transaction(
            transaction_id=uuid.uuid4(),
            user_id=user_id,
            date=row["date"].date(),
            merchant=row["merchant"],
            description=row["description"],
            amount=float(row["amount"]),
            transaction_type=row["transaction_type"],
            category_id=None,
            is_user_corrected=False,
            raw_hash=row["raw_hash"],
        )
        new_transactions.append(txn)
        existing_hashes.add(row["raw_hash"])
        inserted += 1

    if new_transactions:
        db.bulk_save_objects(new_transactions)
        db.commit()

        # Reload from DB to get ORM objects with IDs attached
        hashes = [t.raw_hash for t in new_transactions]
        txn_objects = (
            db.query(Transaction)
            .filter(Transaction.raw_hash.in_(hashes))
            .all()
        )

        # ── Auto-categorize ─────────────────────────────────────────
        try:
            from backend.services.categorizer import load_active_model, predict_batch
            pipeline = load_active_model(db)
            if pipeline:
                predict_batch(txn_objects, pipeline, db)
                db.commit()
        except Exception as e:
            print(f"[categorizer] Warning: auto-categorization failed: {e}")

        # ── Auto anomaly score ───────────────────────────────────────
        try:
            from backend.services.anomaly_detector import load_active_model as load_anomaly, score_batch
            artifact = load_anomaly(db)
            if artifact:
                score_batch(txn_objects, artifact, db)
                db.commit()
            else:
                print("[anomaly] No active model yet — skipping scoring.")
        except Exception as e:
            print(f"[anomaly] Warning: anomaly scoring failed: {e}")

    return {"inserted": inserted, "skipped_duplicates": skipped_duplicates}


def update_monthly_summaries(user_id: str, db: Session) -> None:
    rows = (
        db.query(Transaction.date, Transaction.amount)
        .filter(Transaction.user_id == user_id)
        .all()
    )
    if not rows:
        return

    df = pd.DataFrame(rows, columns=["date", "amount"])
    df["month"] = pd.to_datetime(df["date"]).dt.to_period("M")

    for period, group in df.groupby("month"):
        month_start = period.to_timestamp().date()
        income = float(group[group["amount"] > 0]["amount"].sum())
        expenses = float(group[group["amount"] < 0]["amount"].abs().sum())
        savings = income - expenses

        existing = (
            db.query(MonthlySummary)
            .filter(
                MonthlySummary.user_id == user_id,
                MonthlySummary.month == month_start,
            )
            .first()
        )
        if existing:
            existing.income = income
            existing.expenses = expenses
            existing.savings = savings
        else:
            db.add(MonthlySummary(
                user_id=user_id,
                month=month_start,
                income=income,
                expenses=expenses,
                savings=savings,
            ))
    db.commit()