from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database.connection import get_db
from backend.database.models import User, Subscription
from backend.api.dependencies import get_current_user
from backend.services.subscription_detector import detect

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
def get_subscriptions(
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Subscription).filter(
        Subscription.user_id == current_user.user_id
    )
    if is_active is not None:
        query = query.filter(Subscription.is_active == is_active)

    subs = query.order_by(Subscription.next_expected_date).all()

    return {
        "success": True,
        "data": [
            {
                "subscription_id": str(s.subscription_id),
                "merchant": s.merchant,
                "amount": float(s.amount),
                "frequency": s.frequency,
                "last_seen_date": str(s.last_seen_date),
                "next_expected_date": str(s.next_expected_date),
                "is_active": s.is_active,
            }
            for s in subs
        ]
    }


@router.post("/detect")
def run_detection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = detect(str(current_user.user_id), db)
    return {"success": True, "data": result}


@router.patch("/{subscription_id}/deactivate")
def deactivate_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = db.query(Subscription).filter(
        Subscription.subscription_id == subscription_id,
        Subscription.user_id == current_user.user_id,
    ).first()

    if not sub:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Subscription not found.")

    sub.is_active = False
    db.commit()
    return {"success": True, "message": f"{sub.merchant} marked as cancelled."}