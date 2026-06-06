from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.database.models import User
from backend.api.dependencies import get_current_user
from backend.services.forecaster import forecast, forecast_total

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("")
def get_forecast(
    months_ahead: int = Query(default=1, ge=1, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category_forecasts = forecast(str(current_user.user_id), db, months_ahead)
    total_forecasts = forecast_total(str(current_user.user_id), db, months_ahead)

    if not category_forecasts:
        raise HTTPException(
            status_code=422,
            detail="Not enough transaction data to generate forecasts."
        )

    return {
        "success": True,
        "data": {
            "category_forecasts": category_forecasts,
            "total_forecasts": total_forecasts,
        }
    }