from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
import datetime

# Importaciones del proyecto
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user_models import User
from app.services.equipment_service import EquipmentService
from app.schemas.equipment import (
    EquipmentResponse,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentReception
)
from app.models.equipment_models import Equipo

router = APIRouter()
equipment_service = EquipmentService()

@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_in: EquipmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # <-- EXIGIMOS SABER QUIÉN ES EL USUARIO
):
    # SEGURIDAD: Si es un cliente, ignoramos el ID que manda el frontend
    # y forzamos a que el equipo se registre a SU nombre real.
    if current_user.role_id not in [1, 2] and not (current_user.role and current_user.role.nombre in ["ADMIN", "VENTAS"]):
        equipment_in.cliente_id = current_user.id
        
    return equipment_service.create_equipment(db=db, equipment_data=equipment_in)

@router.put("/{id}", response_model=EquipmentResponse, dependencies=[Depends(get_current_user)])
def update_equipment(id: int, equipment_in: EquipmentUpdate, db: Session = Depends(get_db)):
    return equipment_service.update_equipment(db=db, equipment_id=id, equipment_update=equipment_in)

@router.get("/{id}", response_model=EquipmentResponse, dependencies=[Depends(get_current_user)])
def get_equipment(id: int, db: Session = Depends(get_db)):
    return equipment_service.get_equipment_by_id(db=db, equipment_id=id)

@router.get("/", response_model=list[EquipmentResponse])
def list_equipments(
    db: Session = Depends(get_db), 
    skip: int = 0, 
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    # Si es ADMIN o VENTAS (IDs 1 y 2), ve TODOS los equipos
    if current_user.role_id in [1, 2] or (current_user.role and current_user.role.nombre in ["ADMIN", "VENTAS"]):
        return equipment_service.get_all_equipments(db=db, skip=skip, limit=limit)
    
    # Si es CLIENTE, SQLAlchemy SOLO devuelve los equipos donde él es el dueño
    equipos_del_cliente = db.query(Equipo).filter(Equipo.cliente_id == current_user.id).offset(skip).limit(limit).all()
    return equipos_del_cliente

@router.post("/{id}/reception", response_model=EquipmentResponse, status_code=status.HTTP_200_OK)
def register_equipment_reception(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    observaciones: str | None = Form(None),
    fecha_recepcion: datetime.datetime = Form(...),
    estado_empaque: str = Form(...),
    encendio_correctamente: bool = Form(...),
    file: UploadFile | None = File(None, description="Archivo de evidencia")
):
    if file and file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato no válido.")

    reception_data = EquipmentReception(
        fecha_recepcion=fecha_recepcion,
        estado_empaque=estado_empaque,
        encendio_correctamente=encendio_correctamente,
        observaciones=observaciones
    )

    return equipment_service.process_equipment_reception(
        db=db, equipment_id=id, reception_data=reception_data, current_user=current_user, file=file
    )