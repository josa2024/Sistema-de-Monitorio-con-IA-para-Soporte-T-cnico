from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class EquipmentBase(BaseModel):
    # Eliminamos 'nombre' y 'ubicacion' para igualar el modelo de BD
    numero_serie: str
    modelo: Optional[str] = None  # Lo dejamos opcional o requerido según tu lógica de negocio
    cliente_id: int

class EquipmentCreate(EquipmentBase):
    # Cambiamos 'estado' por 'status' para que coincida con la columna de SQLAlchemy
    # Pydantic recibirá el string y SQLAlchemy lo convertirá automáticamente a tu StatusEquipo(Enum)
    status: Optional[str] = "EN_TRANSITO"

class EquipmentUpdate(BaseModel):
    # Eliminamos 'nombre' y 'ubicacion'
    numero_serie: Optional[str] = None
    modelo: Optional[str] = None
    cliente_id: Optional[int] = None
    # Cambiamos 'estado' por 'status'
    status: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: int
    status: str  # Actualizado a 'status'
    fecha_salida_sucursal: Optional[datetime] = None  # Agregado ya que existe en la BD
    
    # Nota Senior: Estos campos no existen directamente en la tabla 'equipos'. 
    # Si los vas a devolver en el JSON, tu servicio (equipment_service.py) 
    # deberá poblarlos extrayéndolos de las tablas relacionadas (GarantiaLicencia, SeguimientoInstalacion).
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
    usuario_id: Optional[int] = None 
    evento: str  
    detalles: Optional[Dict[str, Any]] = None
    fecha: datetime

    class Config:
        from_attributes = True