from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

# Asumimos que existe una Base declarativa en tu proyecto, similar a los otros modelos
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    mensaje = Column(String, nullable=False)
    leida = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime, default=datetime.now)
    
    # Relación opcional con Ticket (para saber de qué trata la alerta)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    
    # Relación inversa (opcional, depende de si quieres acceder desde Ticket)
    ticket = relationship("Ticket", backref="notificaciones")