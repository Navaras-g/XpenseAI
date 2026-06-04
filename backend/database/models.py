import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float,
    Numeric, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database.connection import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    monthly_summaries = relationship("MonthlySummary", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String(100), nullable=False)
    is_income = Column(Boolean, default=False)

    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    date = Column(Date, nullable=False)
    merchant = Column(String(255))
    description = Column(Text)
    amount = Column(Numeric(12, 2), nullable=False)
    transaction_type = Column(String(20))  # 'debit' or 'credit'
    category_id = Column(Integer, ForeignKey("categories.category_id"))
    is_user_corrected = Column(Boolean, default=False)
    raw_hash = Column(String(64), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    anomaly = relationship("Anomaly", back_populates="transaction", uselist=False)


class Anomaly(Base):
    __tablename__ = "anomalies"

    anomaly_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.transaction_id"), nullable=False)
    anomaly_score = Column(Float)
    is_anomaly = Column(Boolean)
    reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    transaction = relationship("Transaction", back_populates="anomaly")


class Subscription(Base):
    __tablename__ = "subscriptions"

    subscription_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    merchant = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2))
    frequency = Column(String(20))  # 'monthly', 'weekly', 'annual', 'irregular'
    last_seen_date = Column(Date)
    next_expected_date = Column(Date)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="subscriptions")


class MonthlySummary(Base):
    __tablename__ = "monthly_summaries"

    summary_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    month = Column(Date, nullable=False)  # stored as first day of month
    income = Column(Numeric(12, 2), default=0)
    expenses = Column(Numeric(12, 2), default=0)
    savings = Column(Numeric(12, 2), default=0)
    health_score = Column(Float)
    computed_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="monthly_summaries")

    __table_args__ = (
        UniqueConstraint("user_id", "month", name="uq_user_month"),
    )


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    model_id = Column(Integer, primary_key=True, autoincrement=True)
    model_type = Column(String(50), nullable=False)  # 'categorizer' or 'anomaly_detector'
    file_path = Column(Text, nullable=False)
    trained_at = Column(DateTime, server_default=func.now())
    accuracy = Column(Float)
    is_active = Column(Boolean, default=False)