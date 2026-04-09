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
    JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class StatusEquipo(enum.Enum):
    SOLICITADO = "SOLICITADO"             
    PENDIENTE_PAGO = "PENDIENTE_PAGO"     
    EN_TRANSITO = "EN_TRANSITO"           
    RECIBIDO = "RECIBIDO"
    INSTALADO = "INSTALADO"               
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
    cliente_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(StatusEquipo), default=StatusEquipo.EN_TRANSITO)
    fecha_salida_sucursal = Column(DateTime, default=datetime.utcnow)
    
    # --- RELACIONES CON RUTAS ABSOLUTAS ---
    cliente = relationship("app.models.user_models.User", back_populates="equipos")
    seguimiento = relationship("app.models.equipment_models.SeguimientoInstalacion", uselist=False, back_populates="equipo")
    garantias = relationship("app.models.equipment_models.GarantiaLicencia", back_populates="equipo")
    reportes = relationship("app.models.monitoring_models.ReporteAnomalias", back_populates="equipo")
    logs = relationship("EquipmentLog", back_populates="equipo")
    log_eventos = relationship("LogEventos", back_populates="equipo") 
    licencias = relationship("app.models.license_models.License", back_populates="equipo") 

    @property
    def fecha_instalacion(self):
        return self.seguimiento.fecha_registro if self.seguimiento else None

    @property
    def url_evidencia(self):
        return self.seguimiento.evidencia_url if self.seguimiento else None

    @property
    def fecha_inicio_garantia(self):
        if self.garantias:
            garantias_activas = [g for g in self.garantias if g.is_active]
            if garantias_activas:
                return garantias_activas[0].fecha_inicio
        return None


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
    
    equipo = relationship("app.models.equipment_models.Equipo", back_populates="seguimiento")


class GarantiaLicencia(Base):
    __tablename__ = "garantias_licencias"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    tipo = Column(Enum(TipoGarantia))
    nombre_software = Column(String, nullable=True)
    licencia_key = Column(String, nullable=True)  
    
    # === NUEVOS CAMPOS DE LA GARANTÍA ===
    folio = Column(String, unique=True, index=True, nullable=True)
    fecha_reporte = Column(Date, nullable=True)
    ejecutivo_cargo = Column(String, nullable=True)
    marca = Column(String, nullable=True)
    proveedor = Column(String, nullable=True)
    # ====================================

    fecha_inicio = Column(Date)
    fecha_vencimiento = Column(Date)
    is_active = Column(Boolean, default=True)
    
    equipo = relationship("app.models.equipment_models.Equipo", back_populates="garantias")


class EquipmentLog(Base):
    __tablename__ = "equipment_logs"

    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    evento = Column(String, nullable=False)
    detalles = Column(JSON, nullable=True) 
    fecha = Column(DateTime, default=datetime.utcnow)

    equipo = relationship("app.models.equipment_models.Equipo", back_populates="logs")
    usuario = relationship("app.models.user_models.User")