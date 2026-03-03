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
from app.models.database import Base
from datetime import datetime


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellidos = Column(String, nullable=True) 
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    role = relationship("Role", back_populates="users")
    equipos = relationship("Equipo", back_populates="cliente")
    reportes = relationship("ReporteAnomalias", back_populates="cliente")