from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from app.core.database import Base

class TicketStatus(str, enum.Enum):
    ABIERTO = "ABIERTO"
    EN_PROGRESO = "EN_PROGRESO"
    MANTENIMIENTO = "MANTENIMIENTO" # 🔥 NUEVO ESTADO AGREGADO
    RESUELTO = "RESUELTO"
    CERRADO = "CERRADO"

class TicketPriority(str, enum.Enum):
    BAJA = "BAJA"
    MEDIA = "MEDIA"
    ALTA = "ALTA"
    CRITICA = "CRITICA"

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.ABIERTO)
    prioridad = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIA) 
    categoria = Column(String, nullable=True, default="General")
    
    fecha_agendada = Column(DateTime(timezone=True), nullable=True) 
    
    cliente_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones principales
    equipo = relationship("app.models.equipment_models.Equipo", backref="tickets")
    cliente = relationship("app.models.user_models.User", foreign_keys=[cliente_id], backref="tickets_reportados")
    tecnico = relationship("app.models.user_models.User", foreign_keys=[tecnico_id], backref="tickets_asignados")
    
    # Relaciones con los otros módulos del ticket (Comentarios, Logs, Adjuntos)
    comentarios = relationship("ComentarioTicket", back_populates="ticket", cascade="all, delete-orphan")
    logs = relationship("TicketLog", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")


class ComentarioTicket(Base):
    __tablename__ = "comentarios_ticket"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    autor_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    contenido = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    ticket = relationship("Ticket", back_populates="comentarios")
    autor = relationship("app.models.user_models.User", back_populates="comentarios", foreign_keys=[autor_id])


class TicketLog(Base):
    __tablename__ = "ticket_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    accion = Column(String, nullable=False)
    detalles = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    ticket = relationship("Ticket", back_populates="logs")
    usuario = relationship("app.models.user_models.User", foreign_keys=[usuario_id])


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False) # Nombre original del archivo
    file_path = Column(String, nullable=False) # Ruta en el servidor/S3
    content_type = Column(String, nullable=True) # Tipo MIME (ej. image/png)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    ticket = relationship("Ticket", back_populates="attachments")
    uploader = relationship("app.models.user_models.User", foreign_keys=[uploaded_by_id])