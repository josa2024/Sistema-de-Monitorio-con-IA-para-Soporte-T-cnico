from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.equipment import EquipmentResponse
from app.services.inv_service import InventoryService

router = APIRouter()

@router.get("/", response_model=List[EquipmentResponse])
def get_equipments(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    inv_service: InventoryService = Depends()
):
    """
    Lista equipos. 
    Si es ADMIN/VENTAS: ve todos.
    Si es CLIENTE: ve solo los suyos.
    """
    # IMPORTANTE: Pasamos el current_user al servicio para que filtre
    equipments = inv_service.list_equipments(db, skip=skip, limit=limit, current_user=current_user)
    return equipments