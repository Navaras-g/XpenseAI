from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User, ModelRegistry
from backend.api.dependencies import get_current_user
from backend.services import categorizer
from backend.services import anomaly_detector

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


@router.post("/retrain-anomaly-detector")
def retrain_anomaly_detector(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = anomaly_detector.train(db)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")


@router.post("/score-all-transactions")
def score_all_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from backend.services.anomaly_detector import load_active_model, score_batch
    from backend.database.models import Transaction

    artifact = load_active_model(db)
    if not artifact:
        raise HTTPException(status_code=503, detail="No active anomaly model found.")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.user_id)
        .all()
    )

    if not transactions:
        raise HTTPException(status_code=422, detail="No transactions found.")

    score_batch(transactions, artifact, db)
    db.commit()

    from backend.database.models import Anomaly
    flagged = db.query(Anomaly).filter(Anomaly.is_anomaly == True).count()
    total = db.query(Anomaly).count()

    return {
        "success": True,
        "data": {
            "total_scored": total,
            "flagged_anomalies": flagged,
        }
    }



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