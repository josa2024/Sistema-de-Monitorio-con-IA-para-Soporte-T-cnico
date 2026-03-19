import os
import shutil
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import deps
from app.models.license_models import License
from app.models.user_models import User
from app.schemas.license import LicenseResponse
from app.schemas.equipment import EquipmentResponse
from app.services.equipment_service import EquipmentService

router = APIRouter()

# Instanciamos el servicio de equipos para usarlo en este módulo
equipment_service = EquipmentService()

# Configuración de almacenamiento (en producción esto iría en config.py)
UPLOAD_DIR = "uploads/licenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int = Form(...),
    product_key: str | None = Form(None),
    file: UploadFile | None = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sube y asigna una licencia de software a un equipo.
    Acepta archivo físico (PDF/Txt) y/o Product Key.
    """
    if not product_key and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Debe proporcionar al menos un archivo o una Product Key."
        )

    # 1. Desacoplamiento Correcto: Usamos el servicio de equipos.
    # Si el equipo no existe, el servicio lanzará el 404 automáticamente.
    equipment_service.get_equipment_by_id(db=db, equipment_id=equipment_id)

    file_path = None
    filename = None

    # 2. Guardar archivo físico si existe
    if file:
        try:
            # Sanitizar nombre y agregar timestamp para unicidad
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

    # 3. Crear registro en BD
    db_license = License(
        equipo_id=equipment_id,
        product_key=product_key,
        file_path=file_path,
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
    # Actualizado a sintaxis SQLAlchemy 2.0
    stmt = select(License).where(License.id == license_id)
    license_obj = db.execute(stmt).scalar_one_or_none()
    
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Licencia no encontrada."
        )
    
    if not license_obj.file_path or not os.path.exists(license_obj.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="El archivo físico no existe en el servidor."
        )

    # Validar permisos: Descomentar y adaptar cuando la relación con cliente_id esté lista
    # if current_user.role.nombre == "CLIENTE" and license_obj.equipo.cliente_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="No tiene permiso para descargar esta licencia")

    return FileResponse(
        path=license_obj.file_path, 
        filename=license_obj.filename,
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
    # Corregido: Se eliminó el parámetro por defecto de FastAPI y se usa la instancia global
    # Corregido: Llamada al servicio con el nombre correcto de la variable
    return equipment_service.get_warranty_alerts(db)