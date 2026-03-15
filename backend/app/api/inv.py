from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.equipment import EquipmentResponse, EquipmentCreate, EquipmentSolicitar, EquipmentValidar
from app.services.inv_service import InventoryService
import uuid

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
    estado_empaque: str = Form(...),
    confirmacion_encendido: bool = Form(...),
    notas_recepcion: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
   
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
    if equipo.cliente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para recibir este equipo.")

    
    equipo.status = "INSTALADO"
    equipo.fecha_recepcion = datetime.utcnow()
    equipo.notas_recepcion = f"Empaque: {estado_empaque} | Encendió: {'Sí' if confirmacion_encendido else 'No'} | Notas: {notas_recepcion}"
    
    db.commit()
    db.refresh(equipo)
    
    return equipo

@router.post("/solicitar", response_model=EquipmentResponse)
def solicitar_equipo(solicitud: EquipmentSolicitar, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Generamos un Número de Serie temporal hasta que el Admin lo valide
    temp_sn = f"REQ-{uuid.uuid4().hex[:6].upper()}"
    nuevo_equipo = Equipo(
        modelo=solicitud.modelo,
        numero_serie=temp_sn,
        cliente_id=current_user.id,
        status="SOLICITADO"
    )
    db.add(nuevo_equipo)
    db.commit()
    db.refresh(nuevo_equipo)
    return nuevo_equipo

@router.patch("/{equipo_id}/validar", response_model=EquipmentResponse)
def validar_venta(equipo_id: int, datos: EquipmentValidar, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.nombre not in ["ADMIN", "VENTAS"]: 
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo: 
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
        
    equipo.numero_serie = datos.numero_serie
    equipo.status = "PENDIENTE_PAGO"
    db.commit()
    db.refresh(equipo)
    return equipo

@router.patch("/{equipo_id}/pagar", response_model=EquipmentResponse)
def pagar_equipo(equipo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo or equipo.cliente_id != current_user.id: 
        raise HTTPException(status_code=404, detail="No encontrado")
        
    equipo.status = "EN_TRANSITO"
    equipo.fecha_salida_sucursal = datetime.utcnow()
    db.commit()
    db.refresh(equipo)
    return equipo