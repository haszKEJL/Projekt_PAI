from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import signature_routes, admin_routes
from .database import init_db


app = FastAPI(
    title="PDF Signature System API",
    description="System podpisów cyfrowych dla PDF",
    version="1.0.0"
)


# ✅ CORS - POPRAWIONA KONFIGURACJA
# Zezwól na requesty z frontend'u (localhost, Vercel, Render)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Localhost (development)
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        
        # ✅ VERCEL (production) - DODANE!
        "https://projekt-pai-sable.vercel.app",
        
        # Inne możliwe hosty
        # "https://twoj-frontend.netlify.app",
        # "https://twoj-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
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


# ✅ Obsługa preflight OPTIONS
@app.options("/{full_path:path}")
async def preflight_handler(full_path: str):
    return {}
