import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base # Asegúrate de que esta ruta sea correcta en tu proyecto

class TicketStatus(str, enum.Enum):
    ABIERTO = "ABIERTO"
    EN_PROGRESO = "EN_PROGRESO"
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
    estado = Column(Enum(TicketStatus), default=TicketStatus.ABIERTO)
    prioridad = Column(Enum(TicketPriority), default=TicketPriority.MEDIA)
    fecha_creacion = Column(DateTime, default=datetime.now)
    
    # Relaciones
    cliente_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Definimos las relaciones con string para evitar importaciones circulares
    cliente = relationship("app.models.user_models.User", foreign_keys=[cliente_id], backref="tickets_creados")
    equipo = relationship("app.models.equipment_models.Equipo", backref="tickets")
    tecnico = relationship("app.models.user_models.User", foreign_keys=[tecnico_id], backref="tickets_asignados")
    
    # Relación inversa para acceder a los comentarios, logs y adjuntos desde un ticket
    comments = relationship("app.models.ticket.Comment", back_populates="ticket", cascade="all, delete-orphan")
    logs = relationship("TicketLog", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "ticket_comments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contenido = Column(Text, nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    ticket = relationship("app.models.ticket.Ticket", back_populates="comments")
    # CORRECCIÓN: Actualizamos la relación bidireccional para que haga match perfecto con User
    usuario = relationship("app.models.user_models.User", back_populates="comments")


class TicketLog(Base):
    __tablename__ = "ticket_logs"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    accion = Column(String, nullable=False)
    detalles = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    ticket = relationship("app.models.ticket.Ticket", back_populates="logs")
    usuario = relationship("app.models.user_models.User")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    file_name = Column(String, nullable=False) # Nombre original del archivo
    file_path = Column(String, nullable=False) # Ruta en el servidor/S3
    content_type = Column(String, nullable=True) # Tipo MIME (ej. image/png)
    fecha_creacion = Column(DateTime, default=datetime.now)

    # Relaciones
    ticket = relationship("app.models.ticket.Ticket", back_populates="attachments")