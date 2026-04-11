from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
import datetime

from app.core.database import get_db
from app.models.roles import RoleEnum
from app.api.deps import get_current_user, get_current_active_user, require_admin, require_admin_or_ventas
from app.core.websockets import manager
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
async def create_equipment(
    equipment_in: EquipmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role.nombre == RoleEnum.TECNICO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Soporte Técnico no puede registrar equipos.")

    if current_user.role.nombre == RoleEnum.CLIENTE:
        equipment_in.cliente_id = current_user.id
        
    created = equipment_service.create_equipment(db=db, equipment_data=equipment_in)

    try:
        await manager.broadcast({
            "evento": "EQUIPO_REGISTRADO",
            "equipo_id": created.id,
            "numero_serie": created.numero_serie,
            "status": created.status.value if created.status else None,
            "cliente_id": created.cliente_id,
        })
    except Exception as e:
        print(f"Error enviando WebSocket: {e}")

    return created

@router.put("/{id}", response_model=EquipmentResponse, dependencies=[Depends(require_admin)])
def update_equipment(id: int, equipment_in: EquipmentUpdate, db: Session = Depends(get_db)):
    return equipment_service.update_equipment(db=db, equipment_id=id, equipment_update=equipment_in)

@router.get("/{id}", response_model=EquipmentResponse)
def get_equipment(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    equipment = equipment_service.get_equipment_by_id(db=db, equipment_id=id)
    if current_user.role.nombre == RoleEnum.CLIENTE and equipment.cliente_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este equipo.")
    return equipment

@router.get("/", response_model=list[EquipmentResponse])
def list_equipments(
    db: Session = Depends(get_db), 
    skip: int = 0, 
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role.nombre in [RoleEnum.ADMIN, RoleEnum.VENTAS, RoleEnum.TECNICO]:
        return equipment_service.get_all_equipments(db=db, skip=skip, limit=limit)
    
    return db.query(Equipo).filter(Equipo.cliente_id == current_user.id).offset(skip).limit(limit).all()

@router.post("/{id}/reception", response_model=EquipmentResponse, status_code=status.HTTP_200_OK)
async def register_equipment_reception(
    id: int,
    current_user: User = Depends(get_current_active_user),
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

    updated_equipment = equipment_service.process_equipment_reception(
        db=db, equipment_id=id, reception_data=reception_data, current_user=current_user, file=file
    )

    try:
        # Avisar que se procesó una recepción (independientemente si falló o no)
        await manager.broadcast({
            "evento": "EQUIPO_RECEPCIONADO",
            "equipo_id": updated_equipment.id,
            "cliente_id": updated_equipment.cliente_id,
            "status": updated_equipment.status.value if updated_equipment.status else None,
        })

        # 🔥 NUEVA LÓGICA: Solo transmitimos la garantía si el equipo quedó "INSTALADO" sano y salvo
        if updated_equipment.status.value == "INSTALADO":
            garantia = db.query(Equipo).get(updated_equipment.id).garantias[-1] if updated_equipment.garantias else None
            if garantia:
                await manager.broadcast({
                    "evento": "GARANTIA_ACTIVADA",
                    "equipo_id": updated_equipment.id,
                    "garantia_tipo": garantia.tipo.value if garantia.tipo else None,
                    "fecha_vencimiento": garantia.fecha_vencimiento.isoformat() if garantia.fecha_vencimiento else None,
                })
    except Exception as e:
        print(f"Error enviando WebSocket: {e}")

    return updated_equipment

@router.delete("/{id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_admin_or_ventas)])
def delete_equipment(id: int, db: Session = Depends(get_db)):
    equipment_service.delete_equipment(db=db, equipment_id=id)
    return {"message": "Equipo eliminado exitosamente"}