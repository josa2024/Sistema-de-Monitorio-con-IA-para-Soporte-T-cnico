from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session
from typing import Any, List
import shutil
import os

from app.api import deps
from app.schemas.equipment import EquipmentReception, EquipmentResponse, LogResponse
from app.services.inv_service import InventoryService
from app.models.user_models import User

router = APIRouter()

@router.post("/{id}/reception", response_model=EquipmentResponse)
async def confirm_equipment_reception(
    id: int,
    estado_empaque: str = Form(...),
    confirmacion_encendido: bool = Form(...),
    fecha_recepcion: str = Form(...),
    evidencia: UploadFile = File(None),  # Recibe el archivo de forma opcional
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    service: InventoryService = Depends()
) -> Any:
    """
    Confirmar la recepción y encendido del equipo.
    Activa la garantía si el encendido es exitoso.
    Admite subida de evidencia fotográfica (multipart/form-data).
    """
    # 1. Lógica para guardar la imagen localmente
    ruta_imagen = None
    if evidencia:
        # Crear directorio si no existe en la raíz del backend
        os.makedirs("uploads/evidencias", exist_ok=True)
        # Crear ruta única para el archivo para evitar sobrescrituras
        ruta_imagen = f"uploads/evidencias/eq_{id}_{evidencia.filename}"
        
        # Guardar el archivo en el disco
        with open(ruta_imagen, "wb") as buffer:
            shutil.copyfileobj(evidencia.file, buffer)
            
    # 2. Reconstruir el esquema de Pydantic con los datos del formulario
    reception_data = EquipmentReception(
        estado_empaque=estado_empaque,
        confirmacion_encendido=confirmacion_encendido,
        fecha_recepcion=fecha_recepcion,
        ruta_evidencia=ruta_imagen  # Se lo pasamos al esquema
    )

    # 3. Procesar mediante el servicio original
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