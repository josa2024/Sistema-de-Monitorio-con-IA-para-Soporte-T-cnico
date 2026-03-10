from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
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

from app.models.equipment_models import Equipo
from datetime import datetime

@router.post("/{equipo_id}/recepcion", response_model=EquipmentResponse)
def confirmar_recepcion(
    equipo_id: int,
    notas_recepcion: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint para que el cliente confirme la recepción de un equipo 'EN_TRANSITO'.
    Sube una foto y cambia el estado a 'INSTALADO'.
    """
    # Buscamos el equipo en la BD
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
    # Validamos que el equipo pertenezca al cliente logueado
    if equipo.cliente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para recibir este equipo.")

    # Simulamos el guardado de la foto (En la vida real iría a AWS S3)
    # y actualizamos los datos del equipo:
    equipo.status = "INSTALADO"
    equipo.fecha_recepcion = datetime.utcnow()
    equipo.notas_recepcion = notas_recepcion
    
    db.commit()
    db.refresh(equipo)
    
    return equipo