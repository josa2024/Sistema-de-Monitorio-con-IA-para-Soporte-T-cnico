import os
import shutil
from datetime import datetime, timedelta
from typing import Any
from pathlib import Path

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

# Usar ruta absoluta basada en el directorio actual
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads" / "licenses"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_license(
    *,
    db: Session = Depends(deps.get_db),
    equipment_id: str | None = Form(None),
    equipo_id: str | None = Form(None),
    nombre_software: str = Form(...),
    tipo_licencia: str | None = Form(None),
    tipo: str | None = Form(None),
    fecha_inicio: str = Form(...),
    fecha_vencimiento: str | None = Form(None),
    clave_producto: str | None = Form(None),
    licencia_key: str | None = Form(None),
    file: UploadFile | None = File(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sube y asigna una licencia de software a un equipo.
    Acepta archivo físico (PDF/Txt) y/o Product Key.
    """
    print(f"DEBUG: create_license called with equipment_id={equipment_id}, nombre_software={nombre_software}")
    try:
        print("DEBUG: Starting validation...")
        selected_equipment_id = equipment_id or equipo_id
        print(f"DEBUG: selected_equipment_id = {selected_equipment_id}")
        if not selected_equipment_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe proporcionar equipment_id/equipo_id.")
        
        try:
            selected_equipment_id = int(selected_equipment_id)
            print(f"DEBUG: converted to int: {selected_equipment_id}")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"equipment_id debe ser un número: {selected_equipment_id}")

        selected_tipo = (tipo_licencia or tipo or "").strip()
        print(f"DEBUG: selected_tipo = {selected_tipo}")
        if not selected_tipo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe proporcionar tipo_licencia/tipo.")

        tipo_map = {
            "SOFTWARE": LicenseType.Suscripcion,
            "GARANTIA": LicenseType.Perpetua,
            "SUSCRIPCION": LicenseType.Suscripcion,
            "PERPETUA": LicenseType.Perpetua,
            "Suscripcion": LicenseType.Suscripcion,
            "Perpetua": LicenseType.Perpetua,
        }

        tipo_licencia_final = tipo_map.get(selected_tipo)
        print(f"DEBUG: tipo_licencia_final = {tipo_licencia_final}")
        if tipo_licencia_final is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo de licencia inválido: {selected_tipo}")

        selected_clave_producto = clave_producto or licencia_key
        print(f"DEBUG: selected_clave_producto = {selected_clave_producto}, file = {file}")
        if not selected_clave_producto and not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe proporcionar al menos un archivo o una Product Key (clave_producto/licencia_key)."
            )

        print("DEBUG: Checking equipment...")
        # Verificar que el equipo existe
        equipment_service = EquipmentService()
        equipment = equipment_service.get_equipment_by_id(db=db, equipment_id=selected_equipment_id)
        print(f"DEBUG: Equipment found: {equipment.id}")

        file_path = None
        filename = None

        if file:
            print("DEBUG: Processing file...")
            try:
                timestamp = int(datetime.now().timestamp())
                safe_filename = f"{selected_equipment_id}_{timestamp}_{file.filename}"
                file_path = UPLOAD_DIR / safe_filename
                filename = file.filename
                with open(str(file_path), "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                print(f"DEBUG: File saved: {file_path}")
            except Exception as e:
                print(f"DEBUG: Error saving file: {str(e)}")
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")

        print("DEBUG: Parsing dates...")
        # Parsear fechas
        try:
            dt_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            print(f"DEBUG: dt_inicio = {dt_inicio}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Formato de fecha_inicio inválido: {fecha_inicio}")

        dt_vencimiento = None
        if fecha_vencimiento:
            try:
                dt_vencimiento = datetime.strptime(fecha_vencimiento, "%Y-%m-%d").date()
                print(f"DEBUG: dt_vencimiento = {dt_vencimiento}")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Formato de fecha_vencimiento inválido: {fecha_vencimiento}")

        print("DEBUG: Creating license object...")
        # Crear la licencia
        db_license = License(
            equipment_id=selected_equipment_id,
            nombre_software=nombre_software,
            tipo_licencia=tipo_licencia_final,
            fecha_inicio=dt_inicio,
            fecha_vencimiento=dt_vencimiento,
            clave_producto=selected_clave_producto,
            archivo_url=str(file_path) if file_path else None,
            filename=filename,
        )
        
        print("DEBUG: Adding to database...")
        db.add(db_license)
        db.commit()
        db.refresh(db_license)
        print(f"DEBUG: License created with id: {db_license.id}")
        
        return {"message": "Licencia creada exitosamente"}
    except HTTPException:
        # Re-lanzar excepciones HTTP ya manejadas
        raise
    except Exception as e:
        # Capturar cualquier otra excepción no manejada
        print(f"UNHANDLED ERROR in create_license: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

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
            "tipo": "SOFTWARE" if lic.tipo_licencia == LicenseType.Suscripcion else "GARANTIA",
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
            "tipo": "SOFTWARE" if lic.tipo_licencia == LicenseType.Suscripcion else "GARANTIA",
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
