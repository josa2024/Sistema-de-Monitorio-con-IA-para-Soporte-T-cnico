import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.api import api_router
from app.models.license_models import License

# --- 1. Lifespan: Gestión moderna del ciclo de vida de la app ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Todo lo que pongas aquí se ejecuta justo antes de recibir peticiones
    # Garantizamos la ruta exacta que usa inv_service.py para la HU-01
    os.makedirs("uploads/evidence", exist_ok=True)
    
    yield # Aquí es donde la aplicación se queda corriendo y sirviendo peticiones
    
    # Shutdown: Aquí iría la lógica para limpiar recursos al apagar el servidor 
    # (ej. cerrar pools de conexiones a la base de datos si fuera necesario)

app = FastAPI(
    title="Innotrev API",
    description="Sistema de monitoreo para soporte técnico con IA",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan  # Conectamos nuestro gestor de contexto
)

# --- 2. Configuración de CORS Dinámica ---
# Intenta leer BACKEND_CORS_ORIGINS de settings. Si no está definido aún, 
# usa la lista por defecto para que no se rompa tu entorno local.
origins = getattr(settings, "BACKEND_CORS_ORIGINS", [
    "http://localhost",
    "http://localhost:3000", # React / Next.js
    "http://localhost:5173", # Vite (Vue / React)
    "http://localhost:8080",
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Configuración de Archivos Estáticos ---
# Montamos la carpeta raíz "uploads" para servir la evidencia fotográfica
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- 4. Enrutador Principal ---
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    """Endpoint raíz para verificar estado de la API."""
    return {
        "message": "API de Innotrev funcionando correctamente", 
        "version": "1.0.0",
        "status": "online"
    }