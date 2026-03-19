<<<<<<< HEAD
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
=======
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
>>>>>>> origin/jossy
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ReporteAnomalias(Base):
    """
    Modelo para el registro de fallos o anomalías reportadas (HU-02).
    A veces referido como 'Ticket' en otros contextos del sistema.
    """
    __tablename__ = "reporte_anomalias"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(Text, nullable=False)
    prioridad = Column(String, default="MEDIA") # BAJA, MEDIA, ALTA, CRITICA
    fecha_reporte = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # --- RELACIONES CON RUTAS ABSOLUTAS ---
    equipo = relationship("app.models.equipment_models.Equipo", back_populates="reportes")
    cliente = relationship("app.models.user_models.User", back_populates="reportes")
