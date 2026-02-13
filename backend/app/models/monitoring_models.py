from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.database import Base


class ReporteAnomalias(Base):
    __tablename__ = "reportes_anomalias"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    cliente_id = Column(Integer, ForeignKey("usuarios.id"))
    descripcion_cliente = Column(Text)
    categoria_ia = Column(String)
    prioridad_ia = Column(String)
    status_reporte = Column(String, default="PENDIENTE")
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    equipo = relationship("Equipo", back_populates="reportes")
    cliente = relationship("User", back_populates="reportes")


class LogEventos(Base):
    __tablename__ = "logs_eventos"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    evento = Column(String)
    detalles = Column(JSONB)
    fecha = Column(DateTime, default=datetime.utcnow)
    equipo = relationship("Equipo", back_populates="logs")