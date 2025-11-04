"""Główny moduł FastAPI dla systemu podpisów PDF.

Inicjuje aplikację, konfiguruje CORS oraz podłącza routery.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import signature_routes
from .database import init_db

app = FastAPI(
    title="PDF Signature System API",
    description="System podpisów cyfrowych dla PDF",
    version="1.0.0"
)

# CORS – w środowisku produkcyjnym rozważ zawężenie allow_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # W produkcji podaj konkretne URLe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicjalizuj bazę
init_db()

# Rejestracja tras API
app.include_router(signature_routes.router, prefix="/api")

@app.get("/")
async def root():
    """Prosty endpoint powitalny – pomocny do testów dostępności serwera."""
    return {"message": "PDF Signature System API"}

@app.get("/health")
async def health():
    """Lekki healthcheck – można rozszerzyć np. o ping do bazy danych."""
    return {"status": "healthy", "database": "connected"}
