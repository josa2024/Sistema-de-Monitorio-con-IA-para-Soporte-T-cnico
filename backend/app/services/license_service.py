import os
import shutil
from datetime import date, timedelta
from typing import List, Optional

from fastapi import UploadFile, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.models.license import License
from app.schemas.license import LicenseCreate, LicenseRenewal
from app.repositories.equipment_repo import EquipmentRepository
from app.models.user_models import User

UPLOAD_DIR = "uploads/licencias"


class LicenseService:
    def __init__(
        self,
        equipment_repo: EquipmentRepository = Depends(EquipmentRepository)
    ):
        self.equipment_repo = equipment_repo

    def create_license(
        self,
        db: Session,
        license_in: LicenseCreate,
        file: Optional[UploadFile]
    ) -> License:
        # 1. Validar que el equipo existe
        equipo = self.equipment_repo.get_by_id(db, license_in.equipo_id)
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # 2. Manejo del Archivo (si existe)
        file_path = None
        if file:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            # Sanitizar nombre de archivo para evitar problemas en el sistema de archivos
            safe_filename = f"{license_in.equipo_id}_{license_in.nombre_software}_{file.filename}".replace(
                " ", "_")
            file_path = os.path.join(UPLOAD_DIR, safe_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        # 3. Calcular is_active
        is_active = license_in.fecha_vencimiento >= date.today()

        # 4. Crear registro en DB
        db_license = License(
            equipo_id=license_in.equipo_id,
            tipo=license_in.tipo,
            nombre_software=license_in.nombre_software,
            licencia_key=license_in.licencia_key,
            archivo_url=file_path,
            fecha_inicio=license_in.fecha_inicio,
            fecha_vencimiento=license_in.fecha_vencimiento,
            is_active=is_active
        )

        db.add(db_license)
        db.commit()
        db.refresh(db_license)
        return db_license

    def get_equipment_licenses(self, db: Session, equipo_id: int, current_user: User) -> List[License]:
        equipo = self.equipment_repo.get_by_id(db, equipo_id)
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # Validar permisos: Dueño del equipo o Admin/Técnico
        if current_user.role.nombre not in ["ADMIN", "TECNICO"] and equipo.cliente_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="No tienes permiso para ver las licencias de este equipo.")

        return db.query(License).filter(License.equipo_id == equipo_id).all()

    def get_license_file_path(self, db: Session, license_id: int, current_user: User) -> str:
        license_obj = db.query(License).filter(
            License.id == license_id).first()
        if not license_obj:
            raise HTTPException(
                status_code=404, detail="Licencia no encontrada")

        if not license_obj.archivo_url or not os.path.exists(license_obj.archivo_url):
            raise HTTPException(
                status_code=404, detail="El archivo físico no existe en el servidor.")

        # Validar permisos a través del equipo asociado (reutilizando lógica)
        # Nota: Podrías optimizar esto llamando a get_equipment_licenses si quisieras, pero así es directo.
        equipo = self.equipment_repo.get_by_id(db, license_obj.equipo_id)
        if current_user.role.nombre not in ["ADMIN", "TECNICO"] and equipo.cliente_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="No tienes permiso para descargar este archivo.")

        return license_obj.archivo_url

    def renew_license(self, db: Session, license_id: int, renewal_in: LicenseRenewal, current_user: User) -> License:
        license_obj = db.query(License).filter(
            License.id == license_id).first()
        if not license_obj:
            raise HTTPException(
                status_code=404, detail="Licencia no encontrada")

        # Validar permisos: Solo personal autorizado puede extender licencias manualmente
        if current_user.role.nombre not in ["ADMIN", "TECNICO"]:
            raise HTTPException(
                status_code=403, detail="Solo personal autorizado puede renovar licencias.")

        # Actualizar fecha y estado
        license_obj.fecha_vencimiento = renewal_in.fecha_nueva_vencimiento
        # Recalcular si está activa basado en la nueva fecha
        license_obj.is_active = license_obj.fecha_vencimiento >= date.today()

        db.add(license_obj)
        db.commit()
        db.refresh(license_obj)
        return license_obj

    def get_expiring_licenses(self, db: Session, current_user: User, days: int = 30) -> List[License]:
        if current_user.role.nombre not in ["ADMIN", "TECNICO"]:
            raise HTTPException(
                status_code=403, detail="No tienes permiso para ver este reporte.")

        today = date.today()
        limit_date = today + timedelta(days=days)

        return db.query(License).filter(
            License.fecha_vencimiento >= today,
            License.fecha_vencimiento <= limit_date,
            License.is_active == True
        ).all()
