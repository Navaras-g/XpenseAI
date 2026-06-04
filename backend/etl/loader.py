import uuid
from sqlalchemy.orm import Session
from backend.database.models import Transaction, MonthlySummary
from backend.database.connection import SessionLocal
import pandas as pd


def load(df: pd.DataFrame, user_id: str, db: Session) -> dict:
    """
    Insert cleaned transaction rows into the database.
    Skips rows whose raw_hash already exists (cross-upload deduplication).
    Returns a summary dict: {inserted, skipped_duplicates}
    """
    if df.empty:
        return {"inserted": 0, "skipped_duplicates": 0}

    # Fetch all existing hashes for this user in one query
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
            category_id=None,   # set by categorizer after insert
            is_user_corrected=False,
            raw_hash=row["raw_hash"],
        )
        new_transactions.append(txn)
        existing_hashes.add(row["raw_hash"])  # prevent dupes within the same batch
        inserted += 1

    if new_transactions:
        db.bulk_save_objects(new_transactions)
        db.commit()

    return {"inserted": inserted, "skipped_duplicates": skipped_duplicates}


def update_monthly_summaries(user_id: str, db: Session) -> None:
    """
    Recompute monthly_summaries for all months that have transactions for this user.
    Called after every ETL load.
    """
    rows = (
        db.query(
            Transaction.date,
            Transaction.amount,
        )
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

        # Upsert — update if exists, insert if not
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