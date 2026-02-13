from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    LargeBinary,
)
from datetime import datetime
from app.models.database import Base


class BaseConocimientoIA(Base):
    __tablename__ = "base_conocimiento_ia"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    contenido_texto = Column(Text)
    vector_embedding = Column(LargeBinary)
    ultima_actualizacion = Column(DateTime, default=datetime.utcnow)