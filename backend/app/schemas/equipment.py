from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class EquipmentBase(BaseModel):
    nombre: str
    modelo: str
    numero_serie: str
    ubicacion: Optional[str] = None
    cliente_id: int

class EquipmentCreate(EquipmentBase):
    # El estado por defecto se maneja en el servicio, pero permitimos enviarlo si es necesario
    estado: Optional[str] = "EN_TRANSITO"

class EquipmentUpdate(BaseModel):
    nombre: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    ubicacion: Optional[str] = None
    cliente_id: Optional[int] = None
    estado: Optional[str] = None
    # Otros campos técnicos que se puedan actualizar

class EquipmentResponse(EquipmentBase):
    id: int
    estado: str
    fecha_instalacion: Optional[datetime] = None
    fecha_inicio_garantia: Optional[datetime] = None
    url_evidencia: Optional[str] = None

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
    # usuario_id puede ser opcional si el sistema lo permite
    usuario_id: Optional[int] = None 
    evento: str  # En el modelo se llama 'evento', asegúrate de coincidir
    detalles: Optional[Dict[str, Any]] = None
    fecha: datetime

    class Config:
        from_attributes = True
