from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user_models import User
from app.schemas.dashboard import DashboardStatsOut
# 1. Importamos la Clase (con mayúsculas) en lugar de la instancia
from app.services.dashboard_service import DashboardService

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    # 2. Inyectamos el servicio utilizando Depends()
    service: DashboardService = Depends(),
) -> Any:
    """
    Obtiene estadísticas agregadas para el Dashboard Administrativo.
    Realiza consultas optimizadas para no cargar objetos en memoria.
    """
    try:
        # 3. Usamos la instancia inyectada para llamar al método
        return service.get_stats(db=db)
    except Exception as e:
        # En una aplicación real, aquí se registraría el error 'e' en un log.
        raise HTTPException(
            status_code=500,
            detail="Ocurrió un error al procesar las estadísticas del dashboard."
        )