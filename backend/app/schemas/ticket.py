from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.ticket import TicketStatus, TicketPriority

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

class TicketBase(BaseModel):
    titulo: str
    descripcion: str
    prioridad: TicketPriority = TicketPriority.MEDIA

class TicketCreate(TicketBase):
    cliente_id: int
    equipo_id: int
    categoria: Optional[str] = "General"

class TicketUpdate(BaseModel):
    estado: Optional[TicketStatus] = None
    prioridad: Optional[TicketPriority] = None
    fecha_agendada: Optional[datetime] = None

class TicketStatusUpdate(BaseModel):
    estado: TicketStatus

class TicketAssign(BaseModel):
    tecnico_id: int

class CommentCreate(BaseModel):
    contenido: str

class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    autor_id: int
    contenido: str
    fecha_creacion: Optional[datetime] = None
    class Config:
        from_attributes = True

class TicketResponse(TicketCreate):
    id: int
    status: TicketStatus
    prioridad: TicketPriority
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    fecha_agendada: Optional[datetime] = None
    cliente_id: Optional[int] = None
    tecnico_id: Optional[int] = None
    categoria: Optional[str] = "General"
    class Config:
        from_attributes = True