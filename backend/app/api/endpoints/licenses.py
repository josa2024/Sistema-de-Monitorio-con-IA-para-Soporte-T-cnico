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

router = APIRouter()

UPLOAD_DIR = "uploads/licenses"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipo_id: int = Form(...),
    tipo: str = Form(...),
    nombre_software: str = Form(...),
    licencia_key: str | None = Form(None),
    fecha_inicio: str | None = Form(None),
    fecha_vencimiento: str | None = Form(None),
    file: UploadFile | None = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Crea una licencia vinculada a un equipo traduciendo al modelo real"""
    file_path = None
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

    # Mapear el string del Frontend al Enum del Backend
    lic_type = LicenseType.Suscripcion
    if tipo == "GARANTIA":
        lic_type = LicenseType.Perpetua

    db_license = License(
        equipment_id=equipo_id,            # Frontend manda equipo_id
        tipo_licencia=lic_type,            # Frontend manda tipo
        nombre_software=nombre_software,
        fecha_inicio=dt_inicio,
        fecha_vencimiento=dt_vencimiento,
        clave_producto=licencia_key,       # Frontend manda licencia_key
        archivo_url=file_path,             # Frontend espera descargar el file
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
    """Descarga el PDF físico usando la columna correcta"""
    license_obj = db.query(License).filter(License.id == license_id).first()
    if not license_obj or not license_obj.archivo_url or not os.path.exists(license_obj.archivo_url):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el servidor.")

    filename = os.path.basename(license_obj.archivo_url)
    return FileResponse(
        path=license_obj.archivo_url, 
        filename=filename,
        media_type='application/octet-stream'
    )