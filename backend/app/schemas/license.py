from pydantic import BaseModel
from typing import Optional, List
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

# 🔥 NUEVOS ESQUEMAS PARA EL CHAT
class CommentAuthor(BaseModel):
    id: int
    nombre: Optional[str] = None
    email: str
    role_id: Optional[int] = None

    class Config:
        from_attributes = True

class LicenciaCommentResponse(BaseModel):
    id: int
    licencia_id: int
    autor_id: int
    contenido: str
    archivo_url: Optional[str] = None
    fecha_creacion: datetime
    autor: Optional[CommentAuthor] = None

    class Config:
        from_attributes = True

class LicenciaCommentCreate(BaseModel):
    contenido: str
    # El archivo no va aquí porque se enviará como Form-Data (Multipart) en el endpoint

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
    
    # 🔥 Agregamos la lista de comentarios para que viajen junto con la licencia
    comentarios: List[LicenciaCommentResponse] = []

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