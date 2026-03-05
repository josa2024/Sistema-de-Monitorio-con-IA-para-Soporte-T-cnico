from pydantic import BaseModel
from datetime import date
from typing import Literal, Optional, List, Union

class KpiItem(BaseModel):
    """
    Esquema para representar un Indicador Clave de Rendimiento individual.
    """
    nombre: str
    valor: Union[int, float, str]
    descripcion: Optional[str] = None
    
    class Config:
        from_attributes = True

class DashboardKpisOut(BaseModel):
    """
    Esquema de salida que agrupa los KPIs generales solicitados por el servicio.
    """
    kpis: List[KpiItem]


# --- TUS ESQUEMAS ACTUALES PARA EL SISTEMA DE MONITOREO ---

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

class DashboardStatsOut(BaseModel):
    """
    Esquema para el resumen de estadísticas del Dashboard Administrativo.
    """
    total_equipos: int
    equipos_instalados: int
    equipos_en_transito: int
    tickets_abiertos: int
    alertas_vencimiento: List[ExpirationAlert]