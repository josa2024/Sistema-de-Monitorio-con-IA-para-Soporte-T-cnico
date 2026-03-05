from typing import Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.equipment_models import Equipo
from app.models.user_models import User
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from app.schemas.installation import InstallationReportCreate
from app.services.inv_service import InventoryService

router = APIRouter()
inventory_service = InventoryService()

@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    *,
    db: Session = Depends(deps.get_db),
    equipment_in: EquipmentCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Registra un nuevo equipo en el sistema (Admin/Ventas).
    Estado inicial por defecto: EN_TRANSITO.
    """
    # Aquí podríamos validar si el usuario tiene rol de ADMIN o VENTAS
    return inventory_service.register_new_equipment(db=db, equipment_data=equipment_in)

@router.get("/", response_model=List[EquipmentResponse])
def read_equipments(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    cliente_id: Optional[int] = None,
    estado: Optional[str] = None,
    numero_serie: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Lista todos los equipos con filtros opcionales.
    """
    query = db.query(Equipo)
    if cliente_id:
        query = query.filter(Equipo.cliente_id == cliente_id)
    if estado:
        query = query.filter(Equipo.estado == estado)
    if numero_serie:
        query = query.filter(Equipo.numero_serie == numero_serie)
    
    return query.offset(skip).limit(limit).all()

@router.get("/my-equipment", response_model=List[EquipmentResponse])
def read_my_equipment(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    HU-01: Obtiene únicamente los equipos asignados al cliente autenticado.
    """
    return db.query(Equipo).filter(Equipo.cliente_id == current_user.id).all()

@router.get("/{equipment_id}", response_model=EquipmentResponse)
def read_equipment(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Obtiene el detalle de un equipo por ID.
    """
    equipment = db.query(Equipo).filter(Equipo.id == equipment_id).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    return equipment

@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int,
    equipment_in: EquipmentUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Actualiza datos de un equipo existente.
    """
    equipment = db.query(Equipo).filter(Equipo.id == equipment_id).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipo no encontrado"
        )
    
    update_data = equipment_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)

    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return equipment

@router.post("/{equipment_id}/installation", response_model=Any)
def register_installation(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int,
    fecha_recepcion: datetime = Form(...),
    estado_empaque: str = Form(...),
    encendio_correctamente: bool = Form(...),
    observaciones: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    HU-01: Endpoint para registrar la instalación manual del equipo.
    Recibe datos del formulario y una imagen opcional.
    """
    # Validamos que el usuario tenga permisos si es necesario (ej. solo CLIENTE)
    # if current_user.role.nombre != "CLIENTE": ...

    # Convertimos los datos del Form a nuestro esquema Pydantic
    # Esto es necesario porque InventoryService espera un objeto InstallationReportCreate
    report_data = InstallationReportCreate(
        fecha_recepcion=fecha_recepcion,
        estado_empaque=estado_empaque,
        encendio_correctamente=encendio_correctamente,
        observaciones=observaciones
    )

    equipment = inventory_service.register_installation(
        db=db,
        equipment_id=equipment_id,
        report_data=report_data,
        file=file
    )
    return equipment