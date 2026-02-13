from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.license import LicenseResponse, LicenseCreate, LicenseRenewal
from app.services.license_service import LicenseService

router = APIRouter()

@router.post("/", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_license(
    equipo_id: int = Form(...),
    tipo: str = Form(..., description="'SOFTWARE' o 'PÓLIZA_HARDWARE'"),
    nombre_software: str = Form(...),
    licencia_key: Optional[str] = Form(None),
    fecha_inicio: date = Form(...),
    fecha_vencimiento: date = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    service: LicenseService = Depends(LicenseService),
    current_user: User = Depends(get_current_user)
):
    """
    Registrar una nueva licencia o póliza.
    Solo para ADMIN o TECNICO.
    """
    if current_user.role.nombre not in ["ADMIN", "TECNICO"]:
        raise HTTPException(status_code=403, detail="Solo personal autorizado puede registrar licencias.")

    # Construimos el esquema Pydantic manualmente desde los datos del Form
    license_in = LicenseCreate(
        equipo_id=equipo_id,
        tipo=tipo,
        nombre_software=nombre_software,
        licencia_key=licencia_key,
        fecha_inicio=fecha_inicio,
        fecha_vencimiento=fecha_vencimiento
    )

    return service.create_license(db, license_in, file)

@router.get("/equipo/{equipo_id}", response_model=List[LicenseResponse])
def read_equipment_licenses(
    equipo_id: int,
    db: Session = Depends(get_db),
    service: LicenseService = Depends(LicenseService),
    current_user: User = Depends(get_current_user)
):
    """
    Listar licencias de un equipo.
    Accesible para el dueño del equipo y soporte.
    """
    return service.get_equipment_licenses(db, equipo_id, current_user)

@router.get("/descargar/{license_id}")
def download_license_file(
    license_id: int,
    db: Session = Depends(get_db),
    service: LicenseService = Depends(LicenseService),
    current_user: User = Depends(get_current_user)
):
    """
    Descargar el archivo adjunto (PDF, Certificado) de la licencia.
    """
    file_path = service.get_license_file_path(db, license_id, current_user)
    
    # Extraemos el nombre del archivo para que la descarga tenga un nombre limpio
    filename = file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1]
    
    return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')

@router.patch("/{license_id}/renew", response_model=LicenseResponse)
def renew_license(
    license_id: int,
    renewal_in: LicenseRenewal,
    db: Session = Depends(get_db),
    service: LicenseService = Depends(LicenseService),
    current_user: User = Depends(get_current_user)
):
    """
    Renovar una licencia extendiendo su fecha de vencimiento.
    Solo para ADMIN o TECNICO.
    """
    return service.renew_license(db, license_id, renewal_in, current_user)

@router.get("/dashboard/expiring", response_model=List[LicenseResponse])
def get_expiring_licenses(
    days: int = 30,
    db: Session = Depends(get_db),
    service: LicenseService = Depends(LicenseService),
    current_user: User = Depends(get_current_user)
):
    """
    Lista las licencias que vencen en los próximos 'days' días (por defecto 30).
    Exclusivo para ADMIN y TECNICO.
    """
    return service.get_expiring_licenses(db, current_user, days)