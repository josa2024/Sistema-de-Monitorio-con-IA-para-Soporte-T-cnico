from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.database import Base

class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    tipo = Column(String, nullable=False)
    nombre_software = Column(String, nullable=False)
    licencia_key = Column(String, nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    
    # Usamos archivo_url para coincidir con el argumento en LicenseService
    archivo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    equipo = relationship("Equipo", back_populates="licencias")