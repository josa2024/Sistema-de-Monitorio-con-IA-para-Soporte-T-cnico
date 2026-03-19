import os
import shutil
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import deps
from app.models.license_models import License, LicenseType
from app.models.user_models import User
from app.schemas.license import LicenseResponse
from app.schemas.equipment import EquipmentResponse
from app.services.equipment_service import EquipmentService

router = APIRouter()
equipment_service = EquipmentService()

UPLOAD_DIR = "uploads/licenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int = Form(...),
    # --- Agregados los campos obligatorios según tu modelo ---
    nombre_software: str = Form(...),
    tipo_licencia: LicenseType = Form(...),
    fecha_inicio: datetime = Form(...),
    # ---------------------------------------------------------
    clave_producto: str | None = Form(None), # Renombrado a clave_producto
    file: UploadFile | None = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sube y asigna una licencia de software a un equipo.
    Acepta archivo físico (PDF/Txt) y/o Product Key.
    """
    if not clave_producto and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Debe proporcionar al menos un archivo o una Product Key (clave_producto)."
        )

    # Verificamos que el equipo exista
    equipment_service.get_equipment_by_id(db=db, equipment_id=equipment_id)

    file_path = None
    filename = None

    if file:
        try:
            timestamp = int(datetime.now().timestamp())
            filename = file.filename
            safe_filename = f"{equipment_id}_{timestamp}_{filename}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Error al guardar el archivo: {str(e)}"
            )

    # Creación del registro con los nombres EXACTOS de tu modelo de base de datos
    db_license = License(
        equipment_id=equipment_id,
        nombre_software=nombre_software,
        tipo_licencia=tipo_licencia,
        fecha_inicio=fecha_inicio.date(), # Convertimos datetime a date
        clave_producto=clave_producto,
        archivo_url=file_path,
        filename=filename
    )
    
    db.add(db_license)
    db.commit()
    db.refresh(db_license)
    
    return db_license

@router.get("/download/{license_id}")
def download_license(
    *,
    db: Session = Depends(deps.get_db),
    license_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Descarga el archivo de licencia asociado.
    """
    stmt = select(License).where(License.id == license_id)
    license_obj = db.execute(stmt).scalar_one_or_none()
    
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Licencia no encontrada."
        )
    
    # Validamos usando archivo_url en lugar de file_path
    if not license_obj.archivo_url or not os.path.exists(license_obj.archivo_url):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El archivo físico no existe en el servidor."
        )

    # Si tu filename es nulo (por error histórico), le damos un nombre por defecto
    download_name = license_obj.filename if license_obj.filename else "licencia.pdf"

    return FileResponse(
        path=license_obj.archivo_url, 
        filename=download_name,
        media_type='application/octet-stream'
    )

@router.get("/warranties/alerts", response_model=list[EquipmentResponse])
def get_warranty_alerts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Devuelve equipos cuyas garantías vencen en los próximos 30 días.
    Utiliza la lógica centralizada en EquipmentService.
    """
    return equipment_service.get_warranty_alerts(db)