from fastapi import APIRouter
from app.api.endpoints import auth, users, equipment, ws, tickets, licenses, dashboard
from app.api import ai  # <-- Tu ruta de IA

api_router = APIRouter()

# Módulo de Autenticación (Login, Registro)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Módulo de Usuarios (Perfil, Admin)
api_router.include_router(users.router, prefix="/usuarios", tags=["users"])

# Módulo de Equipos (Inventario, Instalación HU-01)
api_router.include_router(equipment.router, prefix="/equipo", tags=["equipment"])

# Módulo de WebSockets
api_router.include_router(ws.router)

# Módulo de Tickets (HU-02)
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])

# Módulo de Licencias
api_router.include_router(licenses.router, prefix="/licencias", tags=["licenses"])

# Módulo de Dashboard
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# Módulo de Inteligencia Artificial (Tuyo)
api_router.include_router(ai.router, prefix="/ai", tags=["ia"])