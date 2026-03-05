from app.core.database import Base  # <-- Aquí está la magia (Ruta corregida hacia core)
from .roles import Role           # Importamos Role desde su propio archivo
from .user_models import User     # Importamos User por separado
from .equipment_models import Equipo, SeguimientoInstalacion, GarantiaLicencia, EquipmentLog
from .monitoring_models import ReporteAnomalias 
from .log import LogEventos
from .ticket import Ticket
from .license_models import License

__all__ = [
    "Base",
    "Role",
    "User",
    "Equipo",
    "SeguimientoInstalacion",
    "GarantiaLicencia",
    "EquipmentLog",      # Añadido al registro
    "ReporteAnomalias",  # Añadido al registro
    "LogEventos",
    "Ticket",
    "License"
]