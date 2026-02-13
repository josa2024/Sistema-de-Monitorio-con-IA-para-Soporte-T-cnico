from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
    EquipmentReception,
    LogResponse
)
from app.services.inv_service import InventoryService

router = APIRouter()

@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Registrar nuevo equipo.
    """
    return service.register_new_equipment(db, equipment_data=equipment_in)

@router.get("/", response_model=List[EquipmentResponse])
def read_equipments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Listar todos los equipos (con paginación).
    """
    return service.list_equipments(db, skip=skip, limit=limit)

@router.get("/{equipment_id}", response_model=EquipmentResponse)
def read_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Ver detalle de un equipo específico.
    """
    return service.get_equipment_by_id(db, equipment_id)

@router.patch("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    equipment_update: EquipmentUpdate,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar datos generales del equipo.
    """
    return service.update_equipment(db, equipment_id, equipment_update, current_user)

@router.patch("/{equipment_id}/recepcion", response_model=EquipmentResponse)
def receive_equipment(
    equipment_id: int,
    reception_data: EquipmentReception,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Registrar la recepción física (activa garantía y cambia estatus).
    Solo disponible para ADMIN o TECNICO.
    """
    if current_user.role.nombre not in ["ADMIN", "TECNICO"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para registrar recepciones."
        )
    return service.process_equipment_reception(db, equipment_id, reception_data, current_user)

@router.get("/{equipment_id}/historial", response_model=List[LogResponse])
def read_equipment_history(
    equipment_id: int,
    db: Session = Depends(get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(get_current_user)
):
    """
    Ver la bitácora de eventos (logs) del equipo.
    """
    return service.get_equipment_history(db, equipment_id)