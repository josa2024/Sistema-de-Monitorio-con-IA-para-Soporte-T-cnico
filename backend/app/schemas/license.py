from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional

# Asumo que LicenseType es un Enum que definiste en tus modelos
from app.models.license_models import LicenseType

class LicenseBase(BaseModel):
    """
    Schema base para la licencia, contiene campos compartidos.
    """
    nombre_software: str
    tipo_licencia: LicenseType
    fecha_inicio: date
    clave_producto: Optional[str] = None
    archivo_url: Optional[str] = None

    # Configuración moderna de Pydantic V2 para leer objetos de SQLAlchemy
    model_config = ConfigDict(from_attributes=True)


class LicenseCreate(LicenseBase):
    """
    Schema para la creación de una licencia.
    Hereda de LicenseBase y añade los campos necesarios para el registro.
    """
    equipment_id: int


# ¡ESTE ES EL CAMBIO CLAVE! Renombrado de License a LicenseResponse
class LicenseResponse(LicenseBase):
    """
    Schema para representar la licencia en las respuestas de la API.
    Incluye campos de solo lectura como el ID y las fechas de auditoría.
    """
    id: int
    equipment_id: int
    fecha_vencimiento: Optional[date] = None
    fecha_creacion: datetime
