from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router

# 1. IMPORTAMOS TODO AL PRINCIPIO
from app.models.database import Base 
from app.core.database import engine 
from app import models # <-- SOLUCIÓN: Evitamos sobreescribir la variable 'app'

# 2. EL MARTILLO DE THOR
Base.metadata.create_all(bind=engine)

# 3. CREAMOS EL SERVIDOR
app = FastAPI(
    title="Innotrev API",
    description="Sistema de monitoreo para soporte técnico con IA",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "API de Innotrev funcionando correctamente", "version": "1.0.0"}