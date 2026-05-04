from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class InstallationReportCreate(BaseModel):
    fecha_recepcion: datetime
    estado_empaque: str
    encendio_correctamente: bool
    observaciones: Optional[str] = None