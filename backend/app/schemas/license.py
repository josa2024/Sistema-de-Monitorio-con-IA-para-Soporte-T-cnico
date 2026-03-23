from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LicenseCreate(BaseModel):
    equipo_id: int
    tipo: str # "SOFTWARE", "GARANTIA_HW", "MANTENIMIENTO"
    nombre_software: str
    licencia_key: Optional[str] = None
    fecha_vencimiento: str # <-- CORRECCIÓN: Lo recibimos como string para evitar errores 422 de formato.
    notas: Optional[str] = None

class LicenseResponse(BaseModel):
    id: int
    equipo_id: int
    tipo: str
    nombre_software: str
    licencia_key: Optional[str] = None
    fecha_vencimiento: datetime
    notas: Optional[str] = None
    
    # Campo que agrega SQLAlchemy al devolver el objeto
    is_active: bool

    class Config:
        from_attributes = True

class LicenseUpdate(BaseModel):
    tipo: Optional[str] = None
    nombre_software: Optional[str] = None
    licencia_key: Optional[str] = None
    fecha_vencimiento: Optional[str] = None # <-- CORRECCIÓN
    notas: Optional[str] = None
    is_active: Optional[bool] = None