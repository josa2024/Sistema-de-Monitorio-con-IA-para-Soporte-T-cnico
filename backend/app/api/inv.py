from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.equipment import EquipmentResponse, EquipmentCreate
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
    equipments = inv_service.list_equipments(db, skip=skip, limit=limit, current_user=current_user)
    return equipments

# --- NUEVO ENDPOINT PARA CREAR/DESPACHAR EQUIPO ---
@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    inv_service: InventoryService = Depends()
):
    """
    Registra un nuevo equipo 'EN_TRANSITO' y lo asigna a un cliente.
    """
    if current_user.role.nombre not in ["ADMIN", "VENTAS"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para despachar equipos.")
    
    return inv_service.register_new_equipment(db=db, equipment_data=equipment_in)

# --- AÑADIR AL FINAL DE inv.py ---
@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    inv_service: InventoryService = Depends()
):
    """Registra un nuevo equipo 'EN_TRANSITO' y lo asigna a un cliente."""
    if current_user.role.nombre not in ["ADMIN", "VENTAS"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para despachar equipos.")
    
    return inv_service.register_new_equipment(db=db, equipment_data=equipment_in)