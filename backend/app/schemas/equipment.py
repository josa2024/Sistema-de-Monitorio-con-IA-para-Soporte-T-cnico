from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class EquipmentBase(BaseModel):
    """Esquema base con campos comunes."""
    numero_serie: str
    modelo: str
    cliente_id: int

class EquipmentCreate(EquipmentBase):
    """Esquema para la creación de un equipo. No se necesita más."""
    pass

class EquipmentReception(BaseModel):
    """Esquema para procesar la recepción física del equipo."""
    estado_empaque: Optional[str] = None
    confirmacion_encendido: bool = False
    fecha_recepcion: datetime
    ruta_evidencia: Optional[str] = None
    ruta_evidencia: Optional[str] = None  # <-- NUEVO CAMPO AGREGADO

class EquipmentUpdate(BaseModel):
    """Esquema para actualizar un equipo. Todos los campos son opcionales."""
    status: Optional[str] = None
    modelo: Optional[str] = None
    cliente_id: Optional[int] = None

class EquipmentResponse(EquipmentBase):
    """
    Esquema para la respuesta de la API.
    Incluye campos adicionales que genera la base de datos.
    """
    id: int
    status: str
    fecha_recepcion: Optional[datetime] = None
    estado_empaque: Optional[str] = None
    confirmacion_encendido: bool = False
    fecha_vencimiento_garantia: Optional[datetime] = None
    ruta_evidencia: Optional[str] = None  # <-- NUEVO CAMPO AGREGADO

    class Config:
        """Habilita el modo 'desde atributos' para mapear desde el modelo SQLAlchemy."""
        from_attributes = True

class LogResponse(BaseModel):
    """Esquema para la respuesta de logs de auditoría."""
    id: int
    equipo_id: int
    evento: str
    detalles: Dict[str, Any]
    fecha: datetime

    class Config:
        from_attributes = True
