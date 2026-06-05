import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder

from backend.database.models import Transaction, Anomaly, ModelRegistry, Category

MODEL_DIR = "models"
MODEL_TYPE = "anomaly_detector"


def _get_model_path() -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(MODEL_DIR, f"{MODEL_TYPE}_v{timestamp}.pkl")


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer features for Isolation Forest from a transactions DataFrame.
    """
    features = pd.DataFrame()
    features["amount_abs"] = df["amount_abs"]
    features["day_of_week"] = df["day_of_week"]
    features["day_of_month"] = df["day_of_month"]
    features["month"] = df["month"]

    # Category as numeric
    le = LabelEncoder()
    features["category_encoded"] = le.fit_transform(
        df["category_id"].fillna(0).astype(str)
    )

    # Amount vs monthly category average ratio
    features["monthly_avg"] = df.groupby(["month", "category_id"])["amount_abs"] \
        .transform("mean").fillna(df["amount_abs"].mean())
    features["amount_ratio"] = (
        features["amount_abs"] / features["monthly_avg"].replace(0, 1)
    )

    return features


def _generate_reason(row: pd.Series, monthly_avg: float) -> str:
    reasons = []

    ratio = row["amount_abs"] / monthly_avg if monthly_avg > 0 else 0

    if ratio > 3:
        reasons.append(
            f"Amount of {row['amount_abs']:.0f} is {ratio:.1f}x higher than your "
            f"usual spend of {monthly_avg:.0f} in this category."
        )
    elif ratio > 2:
        reasons.append(
            f"Amount of {row['amount_abs']:.0f} is about {ratio:.1f}x your typical "
            f"spend of {monthly_avg:.0f} in this category."
        )

    if row["day_of_week"] >= 5:
        reasons.append("Transaction occurred on a weekend.")

    if not reasons:
        reasons.append(
            f"Spending pattern deviates from your historical behaviour "
            f"(usual: {monthly_avg:.0f}, this transaction: {row['amount_abs']:.0f})."
        )

    return " ".join(reasons)


def train(db: Session) -> dict:
    """
    Train Isolation Forest on all transactions for all users.
    Requires at least 30 transactions.
    """
    rows = db.query(
        Transaction.transaction_id,
        Transaction.amount,
        Transaction.category_id,
        Transaction.date,
    ).filter(Transaction.transaction_type == "debit").all()

    if len(rows) < 30:
        raise ValueError(
            f"Need at least 30 transactions to train anomaly detector. "
            f"Currently have {len(rows)}."
        )

    df = pd.DataFrame(rows, columns=["transaction_id", "amount", "category_id", "date"])
    df["amount"] = df["amount"].astype(float)
    df["amount_abs"] = df["amount"].apply(lambda x: abs(x))
    df["day_of_week"] = pd.to_datetime(df["date"]).dt.dayofweek
    df["day_of_month"] = pd.to_datetime(df["date"]).dt.day
    df["month"] = pd.to_datetime(df["date"]).dt.month

    features = _build_features(df)

    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(features)

    # Save model + label info together
    artifact = {"model": model, "feature_columns": list(features.columns)}
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = _get_model_path()
    joblib.dump(artifact, model_path)

    # Deactivate previous
    db.query(ModelRegistry).filter(
        ModelRegistry.model_type == MODEL_TYPE,
        ModelRegistry.is_active == True
    ).update({"is_active": False})

    db.add(ModelRegistry(
        model_type=MODEL_TYPE,
        file_path=model_path,
        accuracy=None,  # unsupervised model — no accuracy metric
        is_active=True,
    ))
    db.commit()

    return {
        "trained_on": len(df),
        "model_path": model_path,
        "contamination": 0.05,
    }


def load_active_model(db: Session) -> dict | None:
    """Load the currently active anomaly detector artifact from disk."""
    record = (
        db.query(ModelRegistry)
        .filter(
            ModelRegistry.model_type == MODEL_TYPE,
            ModelRegistry.is_active == True
        )
        .order_by(ModelRegistry.trained_at.desc())
        .first()
    )
    if not record or not os.path.exists(record.file_path):
        return None
    return joblib.load(record.file_path)



def _is_false_positive(txn, monthly_avg: float, ratio: float) -> bool:
    merchant_upper = (txn.merchant or "").upper()

    # Recurring fixed costs
    recurring_keywords = [
        "RENT", "ELECTRICITY", "WORLDLINK", "VIANET", "SUBISU",
        "NETFLIX", "SPOTIFY", "NCELL", "NTC", "GYM", "INSURANCE"
    ]
    is_recurring = any(kw in merchant_upper for kw in recurring_keywords)
    if is_recurring and ratio < 1.5:
        return True

    # Any anomaly where amount is within 1.5x the category average is noise
    if ratio < 1.5:
        return True

    return False




def score_batch(transactions: list, artifact: dict, db: Session) -> None:
    """
    Score a list of Transaction ORM objects.
    Inserts Anomaly rows for each transaction. Does not commit — caller commits.
    """
    if not transactions or artifact is None:
        return

    # Only score debit transactions
    transactions = [t for t in transactions if t.transaction_type == "debit"]
    if not transactions:
        return

    model: IsolationForest = artifact["model"]

    df = pd.DataFrame([{
        "transaction_id": str(t.transaction_id),
        "amount": float(t.amount),
        "amount_abs": abs(float(t.amount)),
        "category_id": t.category_id,
        "day_of_week": t.date.weekday(),
        "day_of_month": t.date.day,
        "month": t.date.month,
    } for t in transactions])

    features = _build_features(df)

    # Align columns to what the model was trained on
    for col in artifact["feature_columns"]:
        if col not in features.columns:
            features[col] = 0
    features = features[artifact["feature_columns"]]

    scores = model.decision_function(features.values)   # more negative = more anomalous
    predictions = model.predict(features.values)         # -1 = anomaly, 1 = normal

    # Compute per-category monthly averages for reason generation
    df["monthly_avg"] = df.groupby(["month", "category_id"])["amount_abs"] \
        .transform("mean").fillna(df["amount_abs"].mean())

    for i, txn in enumerate(transactions):
        is_anomaly = bool(predictions[i] == -1)
        monthly_avg = float(df.iloc[i]["monthly_avg"])
        ratio = float(df.iloc[i]["amount_abs"]) / monthly_avg if monthly_avg > 0 else 0

        # Apply business rule suppression
        if is_anomaly and _is_false_positive(txn, monthly_avg, ratio):
            is_anomaly = False

        reason = _generate_reason(df.iloc[i], monthly_avg) if is_anomaly else "Normal transaction."

        # Skip if anomaly record already exists for this transaction
        existing = db.query(Anomaly).filter(
            Anomaly.transaction_id == txn.transaction_id
        ).first()
        if existing:
            existing.anomaly_score = float(scores[i])
            existing.is_anomaly = is_anomaly
            existing.reason = reason
        else:
            db.add(Anomaly(
                transaction_id=txn.transaction_id,
                anomaly_score=float(scores[i]),
                is_anomaly=is_anomaly,
                reason=reason,
            ))