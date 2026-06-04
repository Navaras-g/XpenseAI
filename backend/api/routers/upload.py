from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User
from backend.api.dependencies import get_current_user
from backend.etl.extractor import extract, InvalidCSVError
from backend.etl.transformer import transform
from backend.etl import loader

router = APIRouter(prefix="/upload-transactions", tags=["upload"])


@router.post("")
def upload_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    # Extract
    try:
        raw_df = extract(file)
    except InvalidCSVError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Transform
    result = transform(raw_df)

    if result.df.empty:
        raise HTTPException(
            status_code=400,
            detail=f"No valid rows after cleaning. Warnings: {result.warnings}"
        )

    # Load
    load_result = loader.load(result.df, str(current_user.user_id), db)

    # Update monthly summaries
    loader.update_monthly_summaries(str(current_user.user_id), db)

    return {
        "success": True,
        "data": {
            "inserted": load_result["inserted"],
            "skipped_duplicates": load_result["skipped_duplicates"],
            "warnings": result.warnings,
        },
        "message": f"Upload complete. {load_result['inserted']} transactions imported."
    }