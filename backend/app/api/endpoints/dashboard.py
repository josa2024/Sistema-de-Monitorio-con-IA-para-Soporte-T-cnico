from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Importamos la dependencia de seguridad específica
from app.api.deps import get_db, require_admin_or_tecnico
from app.models.user_models import User
# Importamos los schemas para una respuesta bien definida y el servicio
from app.schemas import dashboard as dashboard_schema
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get(
    "/kpis-avanzados",
    response_model=dashboard_schema.AdvancedKpisOut,
    summary="Obtener KPIs Avanzados del Dashboard",
    description="Retorna métricas clave como el tiempo promedio de instalación y las fallas más comunes. El acceso está restringido a Técnicos y Administradores. La respuesta se cachea por 10 minutos."
)
def get_advanced_kpis(
    *,
    db: Session = Depends(get_db),
    # Esta dependencia asegura que el usuario tenga el rol de ADMIN o TECNICO
    current_user: User = Depends(require_admin_or_tecnico),
    service: DashboardService = Depends(DashboardService),
) -> Any:
    """
    Endpoint para obtener los KPIs avanzados.
    """
    try:
        return service.get_advanced_kpis(db=db)
    except Exception as e:
        # Aquí se registraría el error 'e' en un sistema de logging (Sentry, etc.)
        raise HTTPException(
            status_code=500,
            detail=f"Ocurrió un error al procesar los KPIs: {e}"
        )


@router.get(
    "/historicos",
    response_model=dashboard_schema.HistoricalDataOut,
    summary="Obtener Datos Históricos para Gráficos",
    description="Retorna series de tiempo como el volumen de tickets mensuales y equipos instalados recientemente. El acceso está restringido a Técnicos y Administradores."
)
def get_historical_data(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_tecnico),
    service: DashboardService = Depends(DashboardService),
) -> Any:
    """
    Endpoint para obtener datos históricos y series de tiempo.
    """
    try:
        return service.get_historical_data(db=db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ocurrió un error al procesar los datos históricos: {e}"
        )
