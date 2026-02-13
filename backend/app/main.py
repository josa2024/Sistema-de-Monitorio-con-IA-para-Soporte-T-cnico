from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router

app = FastAPI(
    title="Innotrev API",
    description="Sistema de monitoreo para soporte técnico con IA",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json"
)

# Configuración de CORS
# Permitimos todos los orígenes (*) para facilitar el desarrollo.
# En producción, esto debería restringirse a los dominios del frontend.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    """Endpoint raíz para verificar estado."""
    return {"message": "API de Innotrev funcionando correctamente", "version": "1.0.0"}