from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
import datetime

# Importaciones del proyecto
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user_models import User
from app.models.roles import RoleEnum
from app.services.equipment_service import EquipmentService
from app.schemas.equipment import (
    EquipmentResponse,
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentReception
)

router = APIRouter()
equipment_service = EquipmentService()

@router.post(
    "/",
    response_model=EquipmentResponse,
    summary="Crear un nuevo equipo",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_user)] # Proteger endpoint
)
def create_equipment(
    equipment_in: EquipmentCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint para registrar un nuevo equipo en el inventario.
    """
    return equipment_service.create_equipment(db=db, equipment_data=equipment_in)

@router.put(
    "/{id}",
    response_model=EquipmentResponse,
    summary="Actualizar un equipo existente",
    dependencies=[Depends(get_current_user)]
)
def update_equipment(
    id: int,
    equipment_in: EquipmentUpdate,
    db: Session = Depends(get_db)
):
    """
    Endpoint para actualizar la información de un equipo por su ID.
    """
    return equipment_service.update_equipment(db=db, equipment_id=id, equipment_update=equipment_in)

@router.get(
    "/{id}",
    response_model=EquipmentResponse,
    summary="Obtener un equipo por ID",
    dependencies=[Depends(get_current_user)]
)
def get_equipment(id: int, db: Session = Depends(get_db)):
    """
    Endpoint para obtener los detalles de un equipo específico.
    """
    return equipment_service.get_equipment_by_id(db=db, equipment_id=id)

@router.get(
    "/",
    response_model=list[EquipmentResponse], 
    summary="Listar todos los equipos",
    dependencies=[Depends(get_current_user)]
)
def list_equipments(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Endpoint para obtener una lista paginada de todos los equipos.
    """
    return equipment_service.get_all_equipments(db=db, skip=skip, limit=limit)

@router.post(
    "/{id}/reception",
    response_model=EquipmentResponse,
    summary="Registrar recepción de equipo por parte del cliente (HU-01)",
    status_code=status.HTTP_200_OK,
)
def register_equipment_reception(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    observaciones: str | None = Form(None),
    fecha_recepcion: datetime.datetime = Form(...),
    estado_empaque: str = Form(...),
    encendio_correctamente: bool = Form(...),
    file: UploadFile | None = File(None, description="Archivo de evidencia fotográfica (opcional).") 
):
    """
    Endpoint para que un **cliente** registre la recepción de un equipo.
    """
    
    # ELIMINAMOS EL CANDADO REDUNDANTE AQUÍ. 
    # El archivo equipment_service.py ya se encarga de validar quién eres usando role_id.
        
    if file and file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no válido. Solo se permiten imágenes (JPEG, PNG, WEBP)."
        )

    # Creamos el objeto Pydantic a partir de los datos del formulario
    reception_data = EquipmentReception(
        fecha_recepcion=fecha_recepcion,
        estado_empaque=estado_empaque,
        encendio_correctamente=encendio_correctamente,
        observaciones=observaciones
    )

    # El servicio se encarga de toda la lógica de negocio y de validar tus permisos
    updated_equipment = equipment_service.process_equipment_reception(
        db=db,
        equipment_id=id,
        reception_data=reception_data,
        current_user=current_user,
        file=file,
    )
    return updated_equipment