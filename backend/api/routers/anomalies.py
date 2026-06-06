from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date

from backend.database.connection import get_db
from backend.database.models import User, Anomaly, Transaction
from backend.api.dependencies import get_current_user

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


@router.get("")
def get_anomalies(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    is_anomaly: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Anomaly)
        .join(Transaction, Anomaly.transaction_id == Transaction.transaction_id)
        .options(joinedload(Anomaly.transaction))
        .filter(Transaction.user_id == current_user.user_id)
        .filter(Anomaly.is_anomaly == is_anomaly)
    )

    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)

    anomalies = query.order_by(Anomaly.anomaly_score).all()

    return {
        "success": True,
        "count": len(anomalies),
        "data": [
            {
                "anomaly_id": str(a.anomaly_id),
                "transaction_id": str(a.transaction_id),
                "merchant": a.transaction.merchant,
                "date": str(a.transaction.date),
                "amount": abs(float(a.transaction.amount)),
                "anomaly_score": round(a.anomaly_score, 4),
                "is_anomaly": a.is_anomaly,
                "reason": a.reason,
            }
            for a in anomalies
        ],
    }