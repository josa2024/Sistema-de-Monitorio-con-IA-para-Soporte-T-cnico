from pydantic import BaseModel
from datetime import date
from typing import Literal, Optional

class ExpirationAlert(BaseModel):
    """
    Modelo unificado para mostrar alertas de vencimiento en el Dashboard.
    Normaliza datos tanto de Hardware (Garantías) como de Software (Licencias).
    """
    id: int
    tipo: Literal['HARDWARE', 'SOFTWARE']
    nombre: str
    referencia: Optional[str] = None
    fecha_vencimiento: date
    dias_restantes: int
    prioridad: Literal['CRITICA', 'ALERTA', 'NORMAL']