import os
import shutil
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.models.license_models import License, LicenseType
from app.models.user_models import User
from app.services.equipment_service import EquipmentService
from app.schemas.equipment import EquipmentResponse
from sqlalchemy import select

router = APIRouter()
equipment_service = EquipmentService()

UPLOAD_DIR = "uploads/licenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: int = Form(...),
    nombre_software: str = Form(...),
    tipo_licencia: LicenseType = Form(...),
    fecha_inicio: datetime = Form(...),
    fecha_vencimiento: datetime | None = Form(None),
    clave_producto: str | None = Form(None),
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

    equipment_service.get_equipment_by_id(db=db, equipment_id=equipment_id)

    file_path = None
    filename = None

    if file:
        try:
            timestamp = int(datetime.now().timestamp())
            safe_filename = f"{equipo_id}_{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, safe_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")

    # Parsear Fechas a tipo Date para SQLAlchemy
    dt_inicio = datetime.now().date()
    if fecha_inicio:
        try:
            dt_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        except:
            pass

    dt_vencimiento = None
    if fecha_vencimiento:
        try:
            dt_vencimiento = datetime.strptime(fecha_vencimiento, "%Y-%m-%d").date()
        except:
            pass

    db_license = License(
        equipment_id=equipment_id,
        nombre_software=nombre_software,
        tipo_licencia=tipo_licencia,
        fecha_inicio=dt_inicio,
        fecha_vencimiento=dt_vencimiento,
        clave_producto=clave_producto,
        archivo_url=file_path,
        filename=filename,
    )
    
    db.add(db_license)
    db.commit()
    db.refresh(db_license)
    
    return {"message": "Licencia creada exitosamente"}

@router.get("/dashboard/expiring")
def get_expiring_licenses(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retorna licencias próximas a caducar mapeadas para el Frontend"""
    limit_date = (datetime.now() + timedelta(days=days)).date()
    licencias = db.query(License).filter(
        License.fecha_vencimiento.isnot(None),
        License.fecha_vencimiento <= limit_date
    ).all()
    
    return [
        {
            "id": lic.id,
            "equipo_id": lic.equipment_id,
            "tipo": lic.tipo_licencia.value if hasattr(lic.tipo_licencia, 'value') else "SOFTWARE",
            "nombre_software": lic.nombre_software,
            "licencia_key": lic.clave_producto,
            "fecha_vencimiento": lic.fecha_vencimiento.isoformat() if lic.fecha_vencimiento else None
        } for lic in licencias
    ]

@router.get("/equipo/{equipo_id}")
def get_equipment_licenses(
    equipo_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Obtiene licencias de un equipo y las mapea al idioma del Frontend"""
    licencias = db.query(License).filter(License.equipment_id == equipo_id).all()
    return [
        {
            "id": lic.id,
            "equipo_id": lic.equipment_id,
            "tipo": lic.tipo_licencia.value if hasattr(lic.tipo_licencia, 'value') else "SOFTWARE",
            "nombre_software": lic.nombre_software,
            "licencia_key": lic.clave_producto,
            "fecha_vencimiento": lic.fecha_vencimiento.isoformat() if lic.fecha_vencimiento else None
        } for lic in licencias
    ]

@router.get("/descargar/{license_id}")
def download_license(
    *,
    db: Session = Depends(deps.get_db),
    license_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Descarga el archivo de licencia asociado."""
    stmt = select(License).where(License.id == license_id)
    license_obj = db.execute(stmt).scalar_one_or_none()

    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Licencia no encontrada."
        )

    if not license_obj.archivo_url or not os.path.exists(license_obj.archivo_url):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo físico no existe en el servidor."
        )

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
