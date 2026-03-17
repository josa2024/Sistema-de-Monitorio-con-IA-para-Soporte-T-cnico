from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

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
    categoria: Optional[str] = "General"

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    prioridad: Optional[TicketPriority] = None
    fecha_agendada: Optional[datetime] = None

class TicketResponse(TicketCreate):
    id: int
    status: TicketStatus
    prioridad: TicketPriority
    created_at: Optional[datetime] = None       # Sincronizado con BD y Frontend
    updated_at: Optional[datetime] = None
    fecha_agendada: Optional[datetime] = None
    cliente_id: Optional[int] = None
    tecnico_id: Optional[int] = None
    categoria: Optional[str] = "General"

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    contenido: str

class CommentResponse(BaseModel):
    id: int
    contenido: str
    fecha_creacion: Optional[datetime] = None
    ticket_id: int
    autor_id: int                               # Sincronizado con BD (autor_id)

    class Config:
        from_attributes = True