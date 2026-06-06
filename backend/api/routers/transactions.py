from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from datetime import date

from backend.database.connection import get_db
from backend.database.models import User, Transaction, Category
from backend.api.dependencies import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
def get_transactions(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    category_id: int = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == current_user.user_id)
    )
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    total = query.count()
    txns = query.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()

    return {
        "success": True,
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "transaction_id": str(t.transaction_id),
                "date": str(t.date),
                "merchant": t.merchant,
                "description": t.description,
                "amount": float(t.amount),
                "transaction_type": t.transaction_type,
                "category": t.category.category_name if t.category else None,
                "category_id": t.category_id,
                "is_user_corrected": t.is_user_corrected,
            }
            for t in txns
        ],
    }


@router.patch("/{transaction_id}/category")
def update_category(
    transaction_id: str,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id,
        Transaction.user_id == current_user.user_id,
    ).first()

    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    category = db.query(Category).filter(Category.category_id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    txn.category_id = category_id
    txn.is_user_corrected = True
    db.commit()
    db.refresh(txn)

    return {
        "success": True,
        "message": f"Category updated to {category.category_name}.",
        "data": {
            "transaction_id": str(txn.transaction_id),
            "merchant": txn.merchant,
            "category": category.category_name,
            "is_user_corrected": txn.is_user_corrected,
        }
    }