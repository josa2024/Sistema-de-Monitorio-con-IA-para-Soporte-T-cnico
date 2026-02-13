from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TicketPriority(str, enum.Enum):
    BAJA = "BAJA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"

class TicketStatus(str, enum.Enum):
    ABIERTO = "ABIERTO"
    EN_PROGRESO = "EN_PROGRESO"
    RESUELTO = "RESUELTO"
    CERRADO = "CERRADO"

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.ABIERTO)
    prioridad = Column(Enum(TicketPriority), default=TicketPriority.MEDIA) # La IA actualizará esto
    
    cliente_id = Column(Integer, ForeignKey("users.id"))
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    
    fecha_creacion = Column(DateTime, default=datetime.now)
    fecha_actualizacion = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    usuario_id = Column(Integer, ForeignKey("users.id"))
    contenido = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now)