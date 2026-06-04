from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, ModelRegistry
from backend.api.dependencies import get_current_user
from backend.services import categorizer

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/retrain-categorizer")
def retrain_categorizer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = categorizer.train(db)
        return {"success": True, "data": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")


@router.get("/model-status")
def model_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    models = (
        db.query(ModelRegistry)
        .order_by(ModelRegistry.trained_at.desc())
        .limit(5)
        .all()
    )
    return {
        "success": True,
        "data": [
            {
                "model_id": m.model_id,
                "model_type": m.model_type,
                "accuracy": m.accuracy,
                "is_active": m.is_active,
                "trained_at": m.trained_at,
                "file_path": m.file_path,
            }
            for m in models
        ]
    }