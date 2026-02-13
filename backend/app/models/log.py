from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from datetime import datetime
from app.core.database import Base

class LogEventos(Base):
    __tablename__ = "log_eventos"

    id = Column(Integer, primary_key=True, index=True)
    # Asumimos que la tabla de equipos se llama 'equipos'
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    evento = Column(String, nullable=False)
    # Usamos JSON para guardar el diccionario de detalles flexible
    detalles = Column(JSON, nullable=True)
    # Se llena automáticamente con la fecha actual si no se especifica
    fecha = Column(DateTime, default=datetime.now)