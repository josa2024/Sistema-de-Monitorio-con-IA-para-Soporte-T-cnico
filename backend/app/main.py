import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.api import api_router

# --- 1. Lifespan: Gestión moderna del ciclo de vida de la app ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Garantizamos la creación de carpetas para archivos adjuntos
    os.makedirs("uploads/evidence", exist_ok=True)
    os.makedirs("uploads/tickets", exist_ok=True)
    
    yield 

# --- 2. CREAMOS EL SERVIDOR ---
app = FastAPI(
    title="Innotrev API",
    description="Sistema de monitoreo para soporte técnico con IA",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan  
)

# --- 3. Configuración de CORS Dinámica ---
origins = getattr(settings, "BACKEND_CORS_ORIGINS", [
    "http://localhost",
    "http://localhost:3000", 
    "http://localhost:5173", 
    "http://localhost:8080",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. Configuración de Archivos Estáticos ---
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- 5. Enrutador Principal ---
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    """Endpoint raíz para verificar estado de la API."""
    return {
        "message": "API de Innotrev funcionando correctamente", 
        "version": "1.0.0",
        "status": "online"
    }