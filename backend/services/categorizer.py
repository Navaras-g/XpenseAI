import os
import joblib
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

from backend.database.models import Transaction, Category, ModelRegistry

MODEL_DIR = "models"
MODEL_TYPE = "categorizer"


def _get_model_path() -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(MODEL_DIR, f"{MODEL_TYPE}_v{timestamp}.pkl")


def _build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
        ("clf", LogisticRegression(max_iter=1000, C=1.0)),
    ])


def train(db: Session) -> dict:
    """
    Train categorizer on:
    1. Seed data from data/seed_categories.csv
    2. Any user-corrected transactions in the DB
    Saves model to /models/ and registers it in model_registry.
    """
    # ── Load seed data ───────────────────────────────────────────────
    seed_path = os.path.join("data", "seed_categories.csv")
    if not os.path.exists(seed_path):
        raise FileNotFoundError("Seed file not found at data/seed_categories.csv")

    seed_df = pd.read_csv(seed_path)
    seed_df = seed_df.rename(columns={"text": "merchant_normalized", "category_name": "category_name"})
    seed_df["merchant_normalized"] = seed_df["merchant_normalized"].str.lower().str.strip()

    # ── Load user-corrected transactions from DB ─────────────────────
    corrected = (
        db.query(Transaction.merchant, Category.category_name)
        .join(Category, Transaction.category_id == Category.category_id)
        .filter(Transaction.is_user_corrected == True)
        .all()
    )

    if corrected:
        corrected_df = pd.DataFrame(corrected, columns=["merchant_normalized", "category_name"])
        corrected_df["merchant_normalized"] = corrected_df["merchant_normalized"].str.lower().str.strip()
        # User corrections get 3x weight by repeating them
        corrected_df = pd.concat([corrected_df] * 3, ignore_index=True)
        combined_df = pd.concat([seed_df, corrected_df], ignore_index=True)
    else:
        combined_df = seed_df

    combined_df = combined_df.dropna(subset=["merchant_normalized", "category_name"])

    X = combined_df["merchant_normalized"]
    y = combined_df["category_name"]

    # Need at least 2 samples per class for train/test split
    class_counts = y.value_counts()
    valid_classes = class_counts[class_counts >= 2].index
    mask = y.isin(valid_classes)
    X, y = X[mask], y[mask]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = _build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)

    # ── Save model ───────────────────────────────────────────────────
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = _get_model_path()
    joblib.dump(pipeline, model_path)

    # ── Register in DB ───────────────────────────────────────────────
    # Deactivate previous active model
    db.query(ModelRegistry).filter(
        ModelRegistry.model_type == MODEL_TYPE,
        ModelRegistry.is_active == True
    ).update({"is_active": False})

    db.add(ModelRegistry(
        model_type=MODEL_TYPE,
        file_path=model_path,
        accuracy=accuracy,
        is_active=True,
    ))
    db.commit()

    return {
        "accuracy": round(accuracy, 4),
        "f1_macro": round(f1, 4),
        "training_samples": len(X_train),
        "model_path": model_path,
    }


def load_active_model(db: Session) -> Pipeline | None:
    """Load the currently active categorizer model from disk."""
    record = (
        db.query(ModelRegistry)
        .filter(ModelRegistry.model_type == MODEL_TYPE, ModelRegistry.is_active == True)
        .order_by(ModelRegistry.trained_at.desc())
        .first()
    )
    if not record or not os.path.exists(record.file_path):
        return None
    return joblib.load(record.file_path)


def predict_batch(transactions: list, pipeline: Pipeline, db: Session) -> None:
    """
    Run category prediction on a list of Transaction ORM objects.
    Sets category_id on each transaction. Does not commit — caller commits.
    """
    if not transactions or pipeline is None:
        return

    # Build category name → id map
    categories = {c.category_name: c.category_id for c in db.query(Category).all()}

    texts = [
        (t.merchant or "").lower().strip()
        for t in transactions
    ]

    predicted_labels = pipeline.predict(texts)
    probabilities = pipeline.predict_proba(texts)
    max_probs = probabilities.max(axis=1)

    for txn, label, confidence in zip(transactions, predicted_labels, max_probs):
        if txn.is_user_corrected:
            continue  # never override a user correction
        category_id = categories.get(label)
        if category_id:
            txn.category_id = category_id