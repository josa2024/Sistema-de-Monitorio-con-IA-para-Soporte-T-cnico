from pydantic import BaseModel
from typing import Optional
from datetime import date

class LicenseBase(BaseModel):
    tipo: str
    nombre_software: str
    licencia_key: Optional[str] = None
    fecha_inicio: date
    fecha_vencimiento: date

class LicenseCreate(LicenseBase):
    equipo_id: int

class LicenseRenewal(BaseModel):
    fecha_nueva_vencimiento: date

class LicenseResponse(LicenseBase):
    id: int
    equipo_id: int
    archivo_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True