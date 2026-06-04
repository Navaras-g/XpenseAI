from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth.router import router as auth_router

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


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "Expense Intelligence API is running."}