import enum
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    TECNICO = "TECNICO"
    CLIENTE = "CLIENTE"
    SOPORTE = "SOPORTE"
    VENTAS = "VENTAS"  # <--- ¡AQUÍ ESTÁ LA MAGIA!

class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True)
    descripcion = Column(String, nullable=True)

    # Relación con ruta absoluta para evitar importaciones circulares
    users = relationship("app.models.user_models.User", back_populates="role")