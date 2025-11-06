from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import signature_routes, admin_routes
from .database import init_db
import os

app = FastAPI(
    title="PDF Signature System API",
    description="System podpisów cyfrowych dla PDF",
    version="1.0.0"
)

# ✅ CORS - POPRAWIONA KONFIGURACJA DLA RENDER.COM
# Pobierz adres frontenda ze zmiennej środowiskowej lub użyj localhost
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://localhost:8080",
    "https://projekt-pai-gr5.onrender.com/api",
    # Dodaj tutaj URL Twojego frontenda na Render.com:
    FRONTEND_URL,
    # Lub jeśli hosting na innym serwisie, dodaj bezpośrednio:
    # "https://twoj-frontend-nazwa.vercel.app",
    # "https://twoj-frontend-nazwa.netlify.app",
]

# ✅ BARDZO WAŻNE: CORS middleware MUSI być dodany zaraz po stworzeniu app!
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Konkretne originy - NIGDY nie używaj ["*"] z allow_credentials=True
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache CORS odpowiedzi przez 1 godzinę
)

# Inicjalizuj bazę
init_db()

# Routes
app.include_router(signature_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "PDF Signature System API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "database": "connected", "cors": "enabled"}

# ✅ Dodatkowy endpoint diagnostyczny
@app.options("/{full_path:path}")
async def preflight_handler(full_path: str):
    """Obsługuje preflight OPTIONS requests"""
    return {}
