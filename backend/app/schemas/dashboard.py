from pydantic import BaseModel
from typing import List

# --- Schemas para KPIs Avanzados ---

class TopFailureItem(BaseModel):
    """Representa un item en el top de fallas comunes."""
    failure: str
    count: int

class StatusDistributionItem(BaseModel):
    """Representa la distribución de un estado de equipo."""
    status: str
    count: int

class AdvancedKpisOut(BaseModel):
    """Schema de respuesta para los KPIs avanzados del dashboard."""
    average_installation_time_days: float
    top_common_failures: List[TopFailureItem]
    equipment_status_distribution: List[StatusDistributionItem]

    class Config:
        # Permite que Pydantic lea los datos desde modelos de SQLAlchemy
        from_attributes = True

# --- Schemas para Datos Históricos ---

class TimeSeriesItem(BaseModel):
    """Representa un punto de datos en una serie de tiempo."""
    date: str  # Formato "YYYY-MM" para meses, "YYYY-MM-DD" para días
    count: int

class HistoricalDataOut(BaseModel):
    """Schema de respuesta para los datos históricos del dashboard."""
    tickets_created_by_month: List[TimeSeriesItem]
    equipment_installed_last_30_days: List[TimeSeriesItem]

    class Config:
        from_attributes = True

