import re
import pandas as pd
from dataclasses import dataclass, field

def _parse_dates(series: pd.Series) -> pd.Series:
    """Try multiple date formats in order of preference."""
    formats = [
        "%Y-%m-%d",   # 2024-01-05
        "%d-%m-%Y",   # 05-01-2024
        "%d/%m/%Y",   # 05/01/2024
        "%m/%d/%Y",   # 01/05/2024
        "%d %b %Y",   # 05 Jan 2024
        "%d-%b-%Y",   # 05-Jan-2024
    ]
    result = pd.Series([pd.NaT] * len(series), index=series.index)
    remaining = series.copy()

    for fmt in formats:
        parsed = pd.to_datetime(remaining, format=fmt, errors="coerce")
        filled = parsed.notna()
        result[filled] = parsed[filled]
        remaining = remaining[~filled]
        if remaining.empty:
            break

    return result

@dataclass
class TransformResult:
    df: pd.DataFrame
    warnings: list[str] = field(default_factory=list)


# Noise patterns to strip from merchant names
_NOISE_PATTERNS = [
    r"\b(POS|UPI|NEFT|RTGS|IMPS|ACH|EMI|REF|TXN|ID|NO)\b",
    r"#\w+",           # reference codes like #ABC123
    r"\d{6,}",         # long numeric codes
    r"\s{2,}",         # multiple spaces → single space
]


def _clean_merchant(raw: str) -> str:
    if not isinstance(raw, str):
        return "UNKNOWN"
    merchant = raw.upper().strip()
    for pattern in _NOISE_PATTERNS:
        merchant = re.sub(pattern, " ", merchant)
    return merchant.strip()


def transform(df: pd.DataFrame) -> TransformResult:
    """
    Clean and validate the extracted DataFrame.
    Returns a TransformResult with the cleaned DataFrame and a list of warning messages
    for any rows that were skipped.
    """
    warnings = []
    original_count = len(df)

    # ── 1. Parse dates ──────────────────────────────────────────────
    df["date"] = _parse_dates(df["date"])
    bad_dates = df["date"].isna()
    if bad_dates.any():
        count = bad_dates.sum()
        warnings.append(f"Skipped {count} row(s) with unparseable dates.")
    df = df[~bad_dates].copy()

    # ── 2. Parse and validate amounts ───────────────────────────────
    df["amount"] = pd.to_numeric(
        df["amount"].astype(str).str.replace(",", "").str.strip(),
        errors="coerce"
    )
    bad_amounts = df["amount"].isna() | (df["amount"] == 0)
    if bad_amounts.any():
        count = bad_amounts.sum()
        warnings.append(f"Skipped {count} row(s) with invalid or zero amounts.")
    df = df[~bad_amounts].copy()

    # ── 3. Determine transaction type ───────────────────────────────
    df["transaction_type"] = df["amount"].apply(
        lambda x: "credit" if x > 0 else "debit"
    )

    # ── 4. Clean merchant name from description ──────────────────────
    df["merchant"] = df["description"].apply(_clean_merchant)

    # ── 5. Drop duplicate raw_hashes within this upload ─────────────
    before = len(df)
    df = df.drop_duplicates(subset=["raw_hash"])
    dupes = before - len(df)
    if dupes > 0:
        warnings.append(f"Dropped {dupes} duplicate row(s) within the uploaded file.")

    # ── 6. Feature engineering (used by ML, not persisted) ──────────
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["is_weekend"] = df["day_of_week"].isin([5, 6])
    df["month"] = df["date"].dt.month
    df["amount_abs"] = df["amount"].abs()
    df["merchant_normalized"] = df["merchant"].str.lower().str.replace(
        r"[^a-z0-9\s]", "", regex=True
    )

    # ── 7. Final check ───────────────────────────────────────────────
    if df.empty:
        warnings.append("No valid rows remained after cleaning.")

    skipped_total = original_count - len(df)
    if skipped_total > 0 and not any("Skipped" in w for w in warnings):
        warnings.append(f"Total rows skipped: {skipped_total}")

    return TransformResult(df=df, warnings=warnings)