from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel

# Importamos los Enums desde el modelo para mantener consistencia (Single Source of Truth)
from app.models.ticket import TicketStatus, TicketPriority

# Schema para la información básica de un usuario (útil si decidimos anidar datos del técnico)
class UserSimple(BaseModel):
    id: int
    nombre: Optional[str] = None
    email: str

    class Config:
        from_attributes = True

class TicketLogResponse(BaseModel):
    id: int
    ticket_id: int
    usuario_id: int
    accion: str
    detalles: Optional[Any] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# Schema base con campos comunes
class TicketBase(BaseModel):
    titulo: str
    descripcion: str
    prioridad: TicketPriority = TicketPriority.MEDIA

# Schema para creación (Input)
class TicketCreate(TicketBase):
    cliente_id: int
    equipo_id: int

# Schema para actualización general (Input)
class TicketUpdate(BaseModel):
    estado: Optional[TicketStatus] = None
    prioridad: Optional[TicketPriority] = None

# --- NUEVOS SCHEMAS REQUERIDOS POR EL SERVICIO ---

# Schema específico para actualizar solo el estado de forma estricta
class TicketStatusUpdate(BaseModel):
    estado: TicketStatus

# Schema para asignar un técnico al ticket
class TicketAssign(BaseModel):
    tecnico_id: int

# Schema para la creación de un comentario (Input)
class CommentCreate(BaseModel):
    contenido: str
    # Nota de arquitectura: ticket_id y usuario_id NO van aquí. 
    # El ticket_id lo sacarás de la ruta (ej. /tickets/{id}/comments)
    # El usuario_id lo sacarás del token JWT (current_user).

# Schema de respuesta para los comentarios (Output)
class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    usuario_id: int
    contenido: str
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# --- FIN NUEVOS SCHEMAS ---

# Schema de respuesta (Output)
class TicketResponse(TicketBase):
    id: int
    estado: TicketStatus
    cliente_id: int
    equipo_id: int
    tecnico_id: Optional[int] = None  # Campo para saber quién atiende el ticket
    fecha_creacion: datetime

    class Config:
        from_attributes = True