import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Enum,
    Date,
    Boolean,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellidos = Column(String, nullable=True) 
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    # --- RELACIONES CON RUTAS ABSOLUTAS ---
    role = relationship("app.models.roles.Role", back_populates="users")
    equipos = relationship("app.models.equipment_models.Equipo", back_populates="cliente")
    reportes = relationship("app.models.monitoring_models.ReporteAnomalias", back_populates="cliente")
    
    # CORRECCIÓN: Actualizamos la relación a ComentarioTicket
    comentarios = relationship("app.models.ticket.ComentarioTicket", back_populates="autor")
    licencia_comentarios = relationship("app.models.equipment_models.LicenciaComment", back_populates="autor")