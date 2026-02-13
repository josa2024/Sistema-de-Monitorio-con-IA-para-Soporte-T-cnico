from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

# Replicamos los Enums para validación en Pydantic
class TicketPriority(str, Enum):
    BAJA = "BAJA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"

class TicketStatus(str, Enum):
    ABIERTO = "ABIERTO"
    EN_PROGRESO = "EN_PROGRESO"
    RESUELTO = "RESUELTO"
    CERRADO = "CERRADO"

class TicketCreate(BaseModel):
    titulo: str
    descripcion: str
    equipo_id: int

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    prioridad: Optional[TicketPriority] = None

class TicketResponse(TicketCreate):
    id: int
    status: TicketStatus
    prioridad: TicketPriority
    fecha_creacion: datetime
    cliente_id: int

class CommentCreate(BaseModel):
    contenido: str
    # No pedimos ticket_id ni usuario_id aquí porque usualmente
    # se obtienen de la URL y del token de sesión respectivamente.

class CommentResponse(BaseModel):
    id: int
    contenido: str
    fecha_creacion: datetime
    ticket_id: int
    usuario_id: int # Asumiendo que guardas quién hizo el comentario

    class Config:
        from_attributes = True