from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship  # <-- 1. IMPORTAMOS RELATIONSHIP
from datetime import datetime
from app.models.database import Base

class LogEventos(Base):
    __tablename__ = "log_eventos"

    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    evento = Column(String, nullable=False)
    detalles = Column(JSON, nullable=True)
    fecha = Column(DateTime, default=datetime.now)

    # <-- 2. AGREGAMOS ESTA LÍNEA PARA QUE CONOZCA A SU EQUIPO
    equipo = relationship("Equipo", back_populates="logs")