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
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.database import Base
from app.models.user_models import User


class StatusEquipo(enum.Enum):
    SOLICITADO = "SOLICITADO"             # Cliente lo pide
    PENDIENTE_PAGO = "PENDIENTE_PAGO"     # Admin asignó S/N
    EN_TRANSITO = "EN_TRANSITO"           # Cliente pagó
    RECIBIDO = "RECIBIDO"
    INSTALADO = "INSTALADO"               # Cliente validó llegada
    FALLA_REPORTADA = "FALLA_REPORTADA"
    MANTENIMIENTO = "MANTENIMIENTO"

class TipoGarantia(enum.Enum):
    HARDWARE = "HARDWARE"
    SOFTWARE = "SOFTWARE"


class Equipo(Base):
    __tablename__ = "equipos"
    
    id = Column(Integer, primary_key=True, index=True)
    numero_serie = Column(String, unique=True, index=True, nullable=False)
    modelo = Column(String, index=True)
    cliente_id = Column(Integer, ForeignKey("usuarios.id"))
    status = Column(Enum(StatusEquipo), default=StatusEquipo.EN_TRANSITO)
    fecha_salida_sucursal = Column(DateTime, default=datetime.utcnow)
    
    # --- NUEVOS CAMPOS AÑADIDOS PARA LA RECEPCIÓN ---
    estado_empaque = Column(String, nullable=True)
    confirmacion_encendido = Column(Boolean, default=False)
    fecha_recepcion = Column(DateTime, nullable=True)
    fecha_vencimiento_garantia = Column(DateTime, nullable=True)
    ruta_evidencia = Column(String, nullable=True) 
    
    # --- RELACIONES ---
    cliente = relationship("User", back_populates="equipos")
    seguimiento = relationship("SeguimientoInstalacion", uselist=False, back_populates="equipo")
    garantias = relationship("GarantiaLicencia", back_populates="equipo")
    reportes = relationship("ReporteAnomalias", back_populates="equipo")
    logs = relationship("LogEventos", back_populates="equipo")
    licencias = relationship("License", back_populates="equipo")


class SeguimientoInstalacion(Base):
    __tablename__ = "seguimiento_instalacion"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), unique=True)
    fecha_recepcion = Column(Date)
    estado_empaque = Column(String)
    confirmacion_encendido = Column(Boolean)
    evidencia_url = Column(String)
    observaciones = Column(Text)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    equipo = relationship("Equipo", back_populates="seguimiento")


class GarantiaLicencia(Base):
    __tablename__ = "garantias_licencias"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    tipo = Column(Enum(TipoGarantia))
    nombre_software = Column(String)
    licencia_key = Column(String)  # Remember to encrypt this field in the service layer
    fecha_inicio = Column(Date)
    fecha_vencimiento = Column(Date)
    is_active = Column(Boolean, default=True)
    equipo = relationship("Equipo", back_populates="garantias")