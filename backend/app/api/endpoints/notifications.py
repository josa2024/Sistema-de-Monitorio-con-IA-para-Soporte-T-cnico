from typing import Any, List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter()
service = NotificationService()

@router.get("/", response_model=List[NotificationResponse])
def read_notifications(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    unread_only: bool = Query(False, description="Filtrar solo notificaciones no leídas")
) -> Any:
    """
    Obtiene el listado de notificaciones del sistema.
    Útil para rellenar el centro de notificaciones al recargar la página.
    """
    notifications = service.get_notifications(
        db, skip=skip, limit=limit, solo_no_leidas=unread_only
    )
    return notifications

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    *,
    db: Session = Depends(deps.get_db),
    notification_id: int,
) -> Any:
    """
    Marca una notificación como leída.
    Se debe llamar cuando el técnico hace clic en la alerta o la descarta.
    """
    return service.mark_as_read(db, notification_id)