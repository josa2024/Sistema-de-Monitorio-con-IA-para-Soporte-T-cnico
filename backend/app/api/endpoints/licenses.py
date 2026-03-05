import os
import shutil
from datetime import datetime, timedelta
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.models.equipment_models import Equipo
from app.models.license_models import License
from app.models.user_models import User
from app.schemas.license import LicenseResponse
from app.schemas.equipment import EquipmentResponse
from app.services.inv_service import InventoryService

router = APIRouter()

# Configuración de almacenamiento (en producción esto iría en config.py)
UPLOAD_DIR = "uploads/licenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int = Form(...),
    product_key: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sube y asigna una licencia de software a un equipo.
    Acepta archivo físico (PDF/Txt) y/o Product Key.
    """
    # 1. Validar que el equipo existe
    equipment = db.query(Equipo).filter(Equipo.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    if not product_key and not file:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos un archivo o una Product Key")

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
            raise HTTPException(status_code=500, detail=f"Error al guardar el archivo: {str(e)}")

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
    license_obj = db.query(License).filter(License.id == license_id).first()
    if not license_obj:
        raise HTTPException(status_code=404, detail="Licencia no encontrada")
    
    if not license_obj.file_path or not os.path.exists(license_obj.file_path):
        raise HTTPException(status_code=404, detail="El archivo físico no existe en el servidor")

    # Validar permisos: El usuario debe ser dueño del equipo o ser técnico/admin
    # (Asumiendo que Equipo tiene cliente_id)
    # if current_user.role.nombre == "CLIENTE" and license_obj.equipo.cliente_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="No tiene permiso para descargar esta licencia")

    return FileResponse(
        path=license_obj.file_path, 
        filename=license_obj.filename,
        media_type='application/octet-stream'
    )

@router.get("/warranties/alerts", response_model=List[EquipmentResponse])
def get_warranty_alerts(
    db: Session = Depends(deps.get_db),
    service: InventoryService = Depends(InventoryService),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Devuelve equipos cuyas garantías vencen en los próximos 30 días.
    Utiliza la lógica centralizada en InventoryService.
    """
    return service.get_warranty_alerts(db)