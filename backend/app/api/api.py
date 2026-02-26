from fastapi import APIRouter
from app.api import equipment
from app.api import inv  
from app.api import notifications
from app.api import ai
from app.api import licenses
from app.api import tickets
from app.api import auth
from app.api import ws  # <-- 1. IMPORTAMOS WEBSOCKETS

api_router = APIRouter()

api_router.include_router(inv.router, prefix="/equipo", tags=["equipo (CRUD)"])
api_router.include_router(equipment.router, prefix="/equipo", tags=["equipo (Recepción)"])
api_router.include_router(notifications.router, tags=["notificaciones"])
api_router.include_router(ai.router, prefix="/ai", tags=["ia"])
api_router.include_router(licenses.router, prefix="/licencias", tags=["licencias"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(auth.router, tags=["auth"])

# <-- 2. REGISTRAMOS LA RUTA MÁGICA
api_router.include_router(ws.router, prefix="/ws", tags=["websockets"])