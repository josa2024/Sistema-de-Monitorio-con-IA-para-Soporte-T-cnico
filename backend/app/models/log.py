from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LogEventos(Base):
    __tablename__ = "log_eventos"

    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    evento = Column(String, nullable=False)
    detalles = Column(JSON, nullable=True)
    # Se llena automáticamente con la fecha actual si no se especifica
    fecha = Column(DateTime, default=datetime.now)

    equipo = relationship("Equipo", back_populates="log_eventos")
