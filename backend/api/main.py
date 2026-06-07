from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth.router import router as auth_router
from backend.api.routers.upload import router as upload_router
from backend.api.routers.transactions import router as transactions_router
from backend.api.routers.anomalies import router as anomalies_router
from backend.api.routers.subscriptions import router as subscriptions_router
from backend.api.routers.dashboard import router as dashboard_router
from backend.api.routers.insights import router as insights_router
from backend.api.routers.forecast import router as forecast_router
from backend.api.routers.ml import router as ml_router

app = FastAPI(
    title="Expense Intelligence Platform",
    description="Local personal finance analytics API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8501",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(transactions_router)
app.include_router(anomalies_router)
app.include_router(subscriptions_router)
app.include_router(dashboard_router)
app.include_router(insights_router)
app.include_router(forecast_router)
app.include_router(ml_router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Expense Intelligence API is running."}