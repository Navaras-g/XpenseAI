from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from backend.database.connection import get_db
from backend.database.models import User, MonthlySummary, Transaction, Category, Anomaly
from backend.api.dependencies import get_current_user
from backend.services.health_score import compute as compute_health

router = APIRouter(prefix="/dashboard-summary", tags=["dashboard"])


@router.get("")
def get_dashboard_summary(
    month: str = Query(
        default=None,
        description="Month in YYYY-MM format. Defaults to latest month with data."
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Resolve target month
    if month:
        try:
            year, m = month.split("-")
            target_month = date(int(year), int(m), 1)
        except Exception:
            raise HTTPException(status_code=400, detail="Use YYYY-MM format.")
    else:
        # Default to latest month that has data
        latest = (
            db.query(func.max(MonthlySummary.month))
            .filter(MonthlySummary.user_id == current_user.user_id)
            .scalar()
        )
        if not latest:
            return {"success": True, "data": None, "message": "No data yet. Upload a CSV to get started."}
        target_month = latest

    month_end = (target_month.replace(day=28) + timedelta(days=4)).replace(day=1)

    # ── Monthly summary ──────────────────────────────────────────────
    summary = (
        db.query(MonthlySummary)
        .filter(
            MonthlySummary.user_id == current_user.user_id,
            MonthlySummary.month == target_month,
        )
        .first()
    )

    if not summary:
        raise HTTPException(status_code=404, detail=f"No data for {target_month}.")

    # ── Health score ─────────────────────────────────────────────────
    health = compute_health(str(current_user.user_id), target_month, db)

    # ── Top 5 categories by spend ────────────────────────────────────
    top_cats = (
        db.query(Category.category_name, func.sum(func.abs(Transaction.amount)))
        .join(Transaction, Transaction.category_id == Category.category_id)
        .filter(
            Transaction.user_id == current_user.user_id,
            Transaction.transaction_type == "debit",
            Transaction.date >= target_month,
            Transaction.date < month_end,
        )
        .group_by(Category.category_name)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(5)
        .all()
    )

    # ── Anomaly count ────────────────────────────────────────────────
    anomaly_count = (
        db.query(func.count(Anomaly.anomaly_id))
        .join(Transaction, Anomaly.transaction_id == Transaction.transaction_id)
        .filter(
            Transaction.user_id == current_user.user_id,
            Transaction.date >= target_month,
            Transaction.date < month_end,
            Anomaly.is_anomaly == True,
        )
        .scalar() or 0
    )

    # ── Transaction count ────────────────────────────────────────────
    txn_count = (
        db.query(func.count(Transaction.transaction_id))
        .filter(
            Transaction.user_id == current_user.user_id,
            Transaction.date >= target_month,
            Transaction.date < month_end,
        )
        .scalar() or 0
    )

    return {
        "success": True,
        "data": {
            "month": str(target_month),
            "income": float(summary.income),
            "expenses": float(summary.expenses),
            "savings": float(summary.savings),
            "health_score": health["score"],
            "health_summary": health["summary"],
            "health_components": health["components"],
            "top_categories": [
                {"category": cat, "amount": float(amt)}
                for cat, amt in top_cats
            ],
            "anomaly_count": anomaly_count,
            "transaction_count": txn_count,
        }
    }