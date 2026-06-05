from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth.router import router as auth_router
from backend.api.routers.upload import router as upload_router
from backend.api.routers.ml import router as ml_router
from backend.api.routers.subscriptions import router as subscriptions_router
from backend.api.routers.insights import router as insights_router

app = FastAPI(
    title="Expense Intelligence Platform",
    description="Local personal finance analytics API",
    version="1.0.0",
)

# Allow Streamlit (port 8501) to talk to FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(upload_router) 
app.include_router(ml_router)
app.include_router(subscriptions_router)
app.include_router(insights_router)

@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Expense Intelligence API is running."}