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
    
    # Relación con el equipo al que se asigna la licencia.
    equipment_id = Column(Integer, ForeignKey("equipos.id"), nullable=False, index=True)
    equipo = relationship("app.models.equipment_models.Equipo", back_populates="licencias")

    # Campos específicos de la licencia.
    nombre_software = Column(String(255), nullable=False)
    tipo_licencia = Column(Enum(LicenseType), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)  # Nulable para licencias perpetuas.
    
    # Campos para almacenar la clave o el archivo de la licencia.
    clave_producto = Column(String(255), nullable=True)
    archivo_url = Column(String(512), nullable=True)
    filename = Column(String(255), nullable=True) # Agregado para guardar el nombre original del archivo

    # Campo de auditoría para saber cuándo se creó el registro.
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())