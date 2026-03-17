from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.database import Base

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
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.ABIERTO)
    prioridad = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIA) 
    categoria = Column(String, nullable=True, default="General")
    
    fecha_agendada = Column(DateTime(timezone=True), nullable=True) 
    
    cliente_id = Column(Integer, ForeignKey("usuarios.id")) 
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    tecnico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Nombres originales restaurados
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    equipo = relationship("Equipo", backref="tickets")
    cliente = relationship("User", foreign_keys=[cliente_id], backref="tickets_reportados")
    tecnico = relationship("User", foreign_keys=[tecnico_id], backref="tickets_asignados")
    comentarios = relationship("ComentarioTicket", back_populates="ticket", cascade="all, delete-orphan")


class ComentarioTicket(Base):
    __tablename__ = "comentarios_ticket"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    autor_id = Column(Integer, ForeignKey("usuarios.id")) 
    contenido = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="comentarios")
    autor = relationship("User", foreign_keys=[autor_id])