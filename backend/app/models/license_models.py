import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

class LicenseType(enum.Enum):
    Suscripcion = "Suscripcion"
    Perpetua = "Perpetua"

class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    
    equipment_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    equipo = relationship("app.models.equipment_models.Equipo", back_populates="licencias")

    nombre_software = Column(String(255), nullable=False)
    tipo_licencia = Column(Enum(LicenseType), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)  
    
    clave_producto = Column(String(255), nullable=True)
    archivo_url = Column(String(512), nullable=True)
    filename = Column(String(255), nullable=True)

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())