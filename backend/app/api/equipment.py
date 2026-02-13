from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any, List

from app.api import deps
from app.schemas.equipment import EquipmentReception, EquipmentResponse, LogResponse
from app.services.inv_service import InventoryService
from app.models.user_models import User

router = APIRouter()

@router.post("/{id}/reception", response_model=EquipmentResponse)
def confirm_equipment_reception(
    id: int,
    reception_data: EquipmentReception,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    service: InventoryService = Depends()
) -> Any:
    """
    Confirmar la recepción y encendido del equipo.
    Activa la garantía si el encendido es exitoso.
    """
    return service.process_equipment_reception(
        db=db, 
        equipment_id=id, 
        reception_data=reception_data, 
        current_user=current_user
    )

@router.get("/{id}/logs", response_model=List[LogResponse])
def get_equipment_logs(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    service: InventoryService = Depends()
) -> Any:
    """
    Obtiene el historial de auditoría (logs) de un equipo.
    """
    return service.get_equipment_history(db=db, equipment_id=id)