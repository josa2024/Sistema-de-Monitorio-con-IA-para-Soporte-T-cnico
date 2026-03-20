from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Any

class EquipmentBase(BaseModel):
    modelo: str
    numero_serie: str
    cliente_id: int

class EquipmentCreate(EquipmentBase):
    status: Optional[str] = "EN_TRANSITO"

class EquipmentUpdate(BaseModel):
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    cliente_id: Optional[int] = None
    status: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    status: str
    fecha_salida_sucursal: Optional[datetime] = None

    class Config:
        from_attributes = True

# Esquema para la HU-01: Recepción del equipo por parte del cliente
class EquipmentReception(BaseModel):
    fecha_recepcion: datetime
    estado_empaque: str
    encendio_correctamente: bool
    observaciones: Optional[str] = None
    evidencia_url: Optional[str] = None

# Esquema para mostrar el historial de logs
class LogResponse(BaseModel):
    id: int
    equipo_id: int
    usuario_id: Optional[int] = None 
    evento: str
    detalles: Optional[Dict[str, Any]] = None
    fecha: datetime

    class Config:
        from_attributes = True