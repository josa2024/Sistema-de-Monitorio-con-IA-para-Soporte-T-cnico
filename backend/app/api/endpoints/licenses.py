import os
import shutil
import random
from datetime import datetime, timedelta
from typing import Any
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

# Importamos deps para seguridad
from app.api import deps
from app.models.roles import RoleEnum
from app.models.equipment_models import GarantiaLicencia, TipoGarantia 
from app.models.user_models import User
from sqlalchemy import select

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "uploads" / "licenses"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# CAMBIO AQUÍ: Solo el Administrador puede crear pólizas/garantías
@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(deps.require_admin)])
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
    
    fecha_reporte: str | None = Form(None),
    marca: str | None = Form(None),
    proveedor: str | None = Form(None),
    
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Sube y asigna una licencia de software o Expediente de Garantía a un equipo.
    Accesible SOLAMENTE para Administradores.
    """
    try:
        selected_equipment_id = equipment_id or equipo_id
        if not selected_equipment_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe proporcionar equipment_id/equipo_id.")
        
        try:
            selected_equipment_id = int(selected_equipment_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="equipment_id debe ser un número.")

        selected_tipo = (tipo_licencia or tipo or "").strip()
        if not selected_tipo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe proporcionar tipo_licencia/tipo.")

        tipo_licencia_final = TipoGarantia.SOFTWARE if "SOFTWARE" in selected_tipo.upper() else TipoGarantia.HARDWARE

        selected_clave_producto = clave_producto or licencia_key
        if not selected_clave_producto and not file:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debe proporcionar al menos un archivo o una Product Key.")

        try:
            dt_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Formato de fecha_inicio inválido: {fecha_inicio}")

        dt_vencimiento = None
        if fecha_vencimiento:
            try:
                dt_vencimiento = datetime.strptime(fecha_vencimiento, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Formato de fecha_vencimiento inválido: {fecha_vencimiento}")

        dt_reporte = None
        if fecha_reporte:
            try:
                dt_reporte = datetime.strptime(fecha_reporte, "%Y-%m-%d").date()
            except ValueError:
                pass 

        file_path = None
        filename = None

        if file:
            try:
                timestamp = int(datetime.now().timestamp())
                safe_filename = f"{selected_equipment_id}_{timestamp}_{file.filename}"
                file_path = UPLOAD_DIR / safe_filename
                filename = file.filename
                with open(str(file_path), "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {str(e)}")

        folio_generado = None
        if tipo_licencia_final == TipoGarantia.HARDWARE:
            now = datetime.now()
            random_suffix = str(random.randint(1000, 9999))
            folio_generado = f"GAR-{now.strftime('%Y-%m')}-{random_suffix}"

        ejecutivo_nombre = getattr(current_user, 'nombre', current_user.email)

        db_license = GarantiaLicencia(
            equipo_id=selected_equipment_id,
            nombre_software=nombre_software,
            tipo=tipo_licencia_final,
            fecha_inicio=dt_inicio,
            fecha_vencimiento=dt_vencimiento,
            licencia_key=selected_clave_producto,
            folio=folio_generado,
            fecha_reporte=dt_reporte,
            ejecutivo_cargo=ejecutivo_nombre,
            marca=marca,
            proveedor=proveedor
        )
        
        db.add(db_license)
        db.commit()
        db.refresh(db_license)
        
        return {"message": "Expediente/Licencia creada exitosamente", "folio": folio_generado}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


# CAMBIO AQUÍ: Bloqueamos a Ventas, permitimos a Admin, Soporte y Cliente leer
@router.get("/equipo/{equipo_id}")
def get_equipment_licenses(
    equipo_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Obtiene licencias de un equipo y las mapea al Frontend"""
    if current_user.role.nombre == RoleEnum.VENTAS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El rol de Ventas no tiene acceso a las garantías.")

    licencias = db.query(GarantiaLicencia).filter(GarantiaLicencia.equipo_id == equipo_id).all()
    
    resultado = []
    for lic in licencias:
        cliente_obj = lic.equipo.cliente if lic.equipo else None
        cliente_nombre = "Usuario Innotrev"
        if cliente_obj:
            cliente_nombre = getattr(cliente_obj, 'nombre', None) or getattr(cliente_obj, 'email', "Usuario Innotrev")
            
        resultado.append({
            "id": lic.id,
            "equipo_id": lic.equipo_id,
            "tipo": lic.tipo.value if lic.tipo else "HARDWARE",
            "nombre_software": lic.nombre_software,
            "licencia_key": lic.licencia_key,
            "fecha_inicio": lic.fecha_inicio.isoformat() if lic.fecha_inicio else None,
            "fecha_vencimiento": lic.fecha_vencimiento.isoformat() if lic.fecha_vencimiento else None,
            "folio": lic.folio,
            "fecha_reporte": lic.fecha_reporte.isoformat() if lic.fecha_reporte else None,
            "ejecutivo": {"nombre": lic.ejecutivo_cargo},
            "marca": lic.marca,
            "proveedor": lic.proveedor,
            "cliente_nombre": cliente_nombre
        })
        
    return resultado


@router.get("/dashboard/expiring", dependencies=[Depends(deps.require_admin)])
def get_expiring_licenses(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Retorna licencias próximas a caducar (Solo Admin)"""
    limit_date = (datetime.now() + timedelta(days=days)).date()
    licencias = db.query(GarantiaLicencia).filter(
        GarantiaLicencia.fecha_vencimiento.isnot(None),
        GarantiaLicencia.fecha_vencimiento <= limit_date
    ).all()
    
    return [
        {
            "id": lic.id,
            "equipo_id": lic.equipo_id,
            "tipo": "SOFTWARE" if getattr(lic, 'tipo', None) == TipoGarantia.SOFTWARE else "GARANTIA",
            "nombre_software": lic.nombre_software,
            "licencia_key": lic.licencia_key,
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
    if current_user.role.nombre == RoleEnum.VENTAS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El rol de Ventas no tiene acceso a las descargas.")

    stmt = select(GarantiaLicencia).where(GarantiaLicencia.id == license_id)
    license_obj = db.execute(stmt).scalar_one_or_none()

    if not license_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Licencia no encontrada.")

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La descarga de archivos no está configurada para este modelo de Garantía.")