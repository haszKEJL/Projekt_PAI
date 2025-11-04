from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import signature_routes
from .database import init_db

app = FastAPI(
    title="PDF Signature System API",
    description="System podpisów cyfrowych dla PDF",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # W produkcji podaj konkretne URLe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicjalizuj bazę
init_db()

# Routes
app.include_router(signature_routes.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "PDF Signature System API"}

@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected"}
