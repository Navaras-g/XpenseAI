import hashlib
import pandas as pd
from io import BytesIO
from fastapi import UploadFile


# Common column name variants across different banks
COLUMN_VARIANTS = {
    "date": ["date", "transaction date", "posted date", "value date", "txn date", "trans date"],
    "description": ["description", "narration", "details", "memo", "particulars", "remarks", "transaction details"],
    "amount": ["amount", "transaction amount", "net amount"],
    "debit": ["debit", "withdrawal", "dr", "debit amount", "withdrawals"],
    "credit": ["credit", "deposit", "cr", "credit amount", "deposits"],
}


class InvalidCSVError(Exception):
    pass


def _normalize_col(col: str) -> str:
    return col.strip().lower().replace("_", " ").replace("-", " ")


def _detect_column(normalized_cols: list[str], variants: list[str]) -> str | None:
    for variant in variants:
        if variant in normalized_cols:
            return variant
    return None


def extract(file: UploadFile) -> pd.DataFrame:
    """
    Read a CSV upload and return a DataFrame with standardized columns:
    date, description, amount (signed: negative=debit, positive=credit), raw_hash
    Raises InvalidCSVError if required columns can't be detected.
    """
    content = file.file.read()

    try:
        df = pd.read_csv(BytesIO(content), dtype=str)
    except Exception as e:
        raise InvalidCSVError(f"Could not parse file as CSV: {e}")

    if df.empty:
        raise InvalidCSVError("Uploaded CSV is empty.")

    # Normalize column names for matching
    original_cols = list(df.columns)
    normalized_cols = [_normalize_col(c) for c in original_cols]
    col_map = dict(zip(normalized_cols, original_cols))  # normalized -> original

    # Detect each required column role
    detected = {}
    for role, variants in COLUMN_VARIANTS.items():
        match = _detect_column(normalized_cols, variants)
        if match:
            detected[role] = col_map[match]

    # Date and description are always required
    if "date" not in detected:
        raise InvalidCSVError(
            f"Could not detect a date column. Found columns: {original_cols}. "
            "Expected one of: date, transaction date, posted date, value date."
        )
    if "description" not in detected:
        raise InvalidCSVError(
            f"Could not detect a description column. Found columns: {original_cols}. "
            "Expected one of: description, narration, details, memo, particulars."
        )

    # Amount: either a single 'amount' column or separate debit/credit columns
    has_amount = "amount" in detected
    has_debit_credit = "debit" in detected and "credit" in detected

    if not has_amount and not has_debit_credit:
        raise InvalidCSVError(
            f"Could not detect amount columns. Found columns: {original_cols}. "
            "Expected either an 'amount' column or separate 'debit'/'credit' columns."
        )

    # Build a clean working DataFrame
    result = pd.DataFrame()
    result["date"] = df[detected["date"]]
    result["description"] = df[detected["description"]]

    if has_amount:
        result["amount"] = df[detected["amount"]]
    else:
        # Merge separate debit/credit columns into one signed amount column
        debit = pd.to_numeric(df[detected["debit"]].str.replace(",", ""), errors="coerce").fillna(0)
        credit = pd.to_numeric(df[detected["credit"]].str.replace(",", ""), errors="coerce").fillna(0)
        result["amount"] = credit - debit  # positive = inflow, negative = outflow

    # Generate a raw hash for each row to detect duplicates later
    result["raw_hash"] = df.apply(
        lambda row: hashlib.sha256("|".join(str(v) for v in row.values).encode()).hexdigest(),
        axis=1
    )

    return result