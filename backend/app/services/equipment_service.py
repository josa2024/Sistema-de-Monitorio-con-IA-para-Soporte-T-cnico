import os
import shutil
from datetime import datetime, timedelta
from fastapi import UploadFile, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.repositories.equipment_repo import EquipmentRepository
from app.models.equipment_models import Equipo, EquipmentLog, StatusEquipo  # <-- IMPORTAMOS StatusEquipo
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentReception
from app.models.user_models import User

class EquipmentService:
    def __init__(self):
        self.repo = EquipmentRepository()

    def process_equipment_reception(
        self,
        db: Session,
        equipment_id: int,
        reception_data: EquipmentReception,
        current_user: User,
        file: UploadFile | None = None
    ) -> Equipo:
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )

        # CORRECCIÓN DE ENUM: Extraemos el valor en texto para compararlo sin fallas
        current_status = equipment.status.value if hasattr(equipment.status, 'value') else equipment.status

        if current_status != "EN_TRANSITO":
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"El equipo no puede ser instalado porque su estado actual es: {current_status}"
            )

        evidencia_url = getattr(reception_data, "evidencia_url", None)
        if file:
            upload_dir = "uploads/evidence"
            os.makedirs(upload_dir, exist_ok=True)
            timestamp = int(datetime.now().timestamp())
            filename = f"{equipment_id}_{timestamp}_{file.filename}"
            file_path = os.path.join(upload_dir, filename)
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                evidencia_url = file_path
            except Exception as e:
                raise HTTPException(
                    status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al guardar la evidencia fotográfica."
                )

        update_data = {
            "fecha_recepcion": reception_data.fecha_recepcion,
            "estado_empaque": reception_data.estado_empaque,
            "encendio_correctamente": reception_data.encendio_correctamente,
            "observaciones": reception_data.observaciones,
            "status": StatusEquipo.INSTALADO, # <-- Guardamos usando el Enum nativo
            "fecha_instalacion": datetime.now(),
            "fecha_inicio_garantia": datetime.now()
        }
        if evidencia_url:
            update_data["url_evidencia"] = evidencia_url

        updated_equipment = self.repo.update(db, db_obj=equipment, obj_in=update_data)

        new_log = EquipmentLog(
            equipo_id=equipment.id,
            usuario_id=current_user.id,
            evento="INSTALACION_CLIENTE",
            detalles={"observaciones": reception_data.observaciones, "estado_anterior": "EN_TRANSITO"},
            fecha=datetime.now()
        )
        db.add(new_log)
        db.commit()

        return updated_equipment

    def create_equipment(self, db: Session, equipment_data: EquipmentCreate) -> Equipo:
        existing_equipment = self.repo.get_by_serial(db, serial=equipment_data.numero_serie)
        if existing_equipment:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Ya existe un equipo registrado con el número de serie '{equipment_data.numero_serie}'."
            )
        
        data = equipment_data.model_dump()
        
        if "status" not in data:
            data["status"] = StatusEquipo.EN_TRANSITO # <-- Usamos el Enum nativo
            
        if "estado" in data:
            del data["estado"]

        equipment_model = Equipo(**data)
        return self.repo.create_equipment_from_model(db, equipment_model=equipment_model)

    def get_all_equipments(self, db: Session, skip: int = 0, limit: int = 100) -> list[Equipo]:
        return self.repo.get_all(db, skip=skip, limit=limit)

    def get_equipment_by_id(self, db: Session, equipment_id: int) -> Equipo:
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )
        return equipment

    def update_equipment(self, db: Session, equipment_id: int, equipment_update: EquipmentUpdate) -> Equipo:
        equipment = self.get_equipment_by_id(db, equipment_id)
        update_data = equipment_update.model_dump(exclude_unset=True)

        if "numero_serie" in update_data and update_data["numero_serie"] != equipment.numero_serie:
            existing = self.repo.get_by_serial(db, serial=update_data["numero_serie"])
            if existing and existing.id != equipment_id:
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail=f"El número de serie '{update_data['numero_serie']}' ya está en uso por otro equipo."
                )

        if "status" in update_data and isinstance(update_data["status"], str):
             update_data["status"] = StatusEquipo(update_data["status"])

        return self.repo.update(db, db_obj=equipment, obj_in=update_data)

    def get_equipment_history(self, db: Session, equipment_id: int) -> list:
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )
        return equipment.logs

    def get_warranty_alerts(self, db: Session, days_threshold: int = 30) -> list[Equipo]:
        WARRANTY_PERIOD_DAYS = 365
        now = datetime.now()
        
        min_start_date = now - timedelta(days=WARRANTY_PERIOD_DAYS)
        max_start_date = min_start_date + timedelta(days=days_threshold)
        
        return db.query(Equipo).filter(
            Equipo.fecha_inicio_garantia.isnot(None),
            Equipo.fecha_inicio_garantia >= min_start_date,
            Equipo.fecha_inicio_garantia <= max_start_date
        ).all()