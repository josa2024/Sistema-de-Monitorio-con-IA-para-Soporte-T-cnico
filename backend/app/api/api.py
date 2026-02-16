from fastapi import APIRouter
from app.api import equipment
from app.api import notifications
from app.api import ai
from app.api import licenses
from app.api import tickets
from app.api import auth

api_router = APIRouter()

# Registramos los routers con sus prefijos correspondientes
api_router.include_router(equipment.router, prefix="/equipo", tags=["equipo"])
# El router de notificaciones ya define /ws/notifications, así que no agregamos prefijo extra aquí
api_router.include_router(notifications.router, tags=["notificaciones"])
api_router.include_router(ai.router, prefix="/ai", tags=["ia"])
api_router.include_router(licenses.router, prefix="/licencias", tags=["licencias"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(auth.router, tags=["auth"])