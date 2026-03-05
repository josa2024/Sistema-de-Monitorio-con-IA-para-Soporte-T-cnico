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

# ELIMINADA: Quitamos la clase Role duplicada que estaba aquí.
# Ahora la única fuente de verdad será app/models/roles.py

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    is_active = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    
    # --- RELACIONES CON RUTAS ABSOLUTAS ---
    role = relationship("app.models.roles.Role", back_populates="users")
    equipos = relationship("app.models.equipment_models.Equipo", back_populates="cliente")
    reportes = relationship("app.models.monitoring_models.ReporteAnomalias", back_populates="cliente")
    
    # ¡AQUÍ ESTÁ LA CORRECCIÓN! Actualizamos la ruta a app.models.ticket.Comment
    comments = relationship("app.models.ticket.Comment", back_populates="usuario")