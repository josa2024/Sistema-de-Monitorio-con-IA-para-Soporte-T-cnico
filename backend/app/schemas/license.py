from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class LicenseCreate(BaseModel):
    equipo_id: int
    tipo: str # "SOFTWARE", "GARANTIA_HW", "MANTENIMIENTO"
    nombre_software: str
    licencia_key: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_vencimiento: str
    notas: Optional[str] = None
    
    # Nuevos campos al crear
    folio: Optional[str] = None
    fecha_reporte: Optional[str] = None
    ejecutivo_cargo: Optional[str] = None
    marca: Optional[str] = None
    proveedor: Optional[str] = None

class LicenseResponse(BaseModel):
    id: int
    equipo_id: int
    tipo: str
    nombre_software: str
    licencia_key: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_vencimiento: date
    notas: Optional[str] = None
    
    # Nuevos campos a devolver al frontend
    folio: Optional[str] = None
    fecha_reporte: Optional[date] = None
    ejecutivo_cargo: Optional[str] = None
    marca: Optional[str] = None
    proveedor: Optional[str] = None
    
    is_active: bool

    class Config:
        from_attributes = True

class LicenseUpdate(BaseModel):
    tipo: Optional[str] = None
    nombre_software: Optional[str] = None
    licencia_key: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_vencimiento: Optional[str] = None 
    notas: Optional[str] = None
    
    folio: Optional[str] = None
    fecha_reporte: Optional[str] = None
    ejecutivo_cargo: Optional[str] = None
    marca: Optional[str] = None
    proveedor: Optional[str] = None
    
    is_active: Optional[bool] = None