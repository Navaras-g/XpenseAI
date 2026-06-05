from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from backend.database.connection import get_db
from backend.database.models import User
from backend.api.dependencies import get_current_user
from backend.services.insight_engine import generate

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def get_insights(
    month: str = Query(
        default=None,
        description="Month in YYYY-MM format. Defaults to current month."
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if month:
        try:
            year, m = month.split("-")
            target_month = date(int(year), int(m), 1)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid month format. Use YYYY-MM e.g. 2024-03"
            )
    else:
        today = date.today()
        target_month = date(today.year, today.month, 1)

    insights = generate(str(current_user.user_id), target_month, db)

    return {
        "success": True,
        "month": str(target_month),
        "count": len(insights),
        "data": insights,
    }