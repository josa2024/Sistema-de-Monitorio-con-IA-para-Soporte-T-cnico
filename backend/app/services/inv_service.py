from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, Depends

from app.repositories.equipment_repo import EquipmentRepository
from app.repositories.log_repo import LogRepository
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentReception
from app.models.equipment_models import Equipo
from app.models.log import LogEventos
from app.models.user_models import User

class InventoryService:
    def __init__(
        self, 
        equipment_repo: EquipmentRepository = Depends(EquipmentRepository),
        log_repo: LogRepository = Depends(LogRepository)
    ):
        self.equipment_repo = equipment_repo
        self.log_repo = log_repo

    def register_new_equipment(self, db: Session, *, equipment_data: EquipmentCreate) -> Equipo:
        cliente = db.query(User).filter(User.id == equipment_data.cliente_id).first()
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El cliente con ID {equipment_data.cliente_id} no existe."
            )

        try:
            db_equipment = Equipo(
                **equipment_data.model_dump(),
                status='EN_TRANSITO',
                fecha_salida_sucursal=datetime.now()
            )
            
            created_equipment = self.equipment_repo.create_equipment_from_model(db=db, equipment_model=db_equipment)
            return created_equipment

        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El número de serie '{equipment_data.numero_serie}' ya existe."
            )

    def get_equipment_by_id(self, db: Session, equipment_id: int) -> Equipo:
        equipment = self.equipment_repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipo no encontrado"
            )
        return equipment

    # ¡AQUÍ ESTÁ LA MAGIA DEL FILTRADO! Añadimos current_user
    def list_equipments(self, db: Session, skip: int = 0, limit: int = 100, current_user: User = None) -> List[Equipo]:
        # Si no hay usuario o es Admin/Ventas, devuelve todos
        if not current_user or current_user.role.nombre in ["ADMIN", "VENTAS"]:
            return self.equipment_repo.get_all(db, skip=skip, limit=limit)
        
        # Si es cliente, filtramos por su ID en la base de datos
        return db.query(Equipo).filter(Equipo.cliente_id == current_user.id).offset(skip).limit(limit).all()

    def update_equipment(self, db: Session, equipment_id: int, equipment_update: EquipmentUpdate, current_user: User) -> Equipo:
        db_equipment = self.get_equipment_by_id(db, equipment_id)
        status_anterior = db_equipment.status

        update_data = equipment_update.model_dump(exclude_unset=True)
        updated_equipment = self.equipment_repo.update(db, db_obj=db_equipment, obj_in=update_data)

        if "status" in update_data and update_data["status"] != status_anterior:
            log = LogEventos(
                equipo_id=equipment_id,
                evento="CAMBIO_ESTATUS",
                detalles={
                    "status_anterior": status_anterior.value if status_anterior else None,
                    "status_nuevo": update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"],
                    "usuario_id": current_user.id
                }
            )
            self.log_repo.create_log(db, log)

        return updated_equipment

    def process_equipment_reception(self, db: Session, equipment_id: int, reception_data: EquipmentReception, current_user: User) -> Equipo:
        db_equipment = self.get_equipment_by_id(db, equipment_id)
        status_anterior = db_equipment.status

        db_equipment.estado_empaque = reception_data.estado_empaque
        db_equipment.confirmacion_encendido = reception_data.confirmacion_encendido
        db_equipment.fecha_recepcion = reception_data.fecha_recepcion
        db_equipment.status = 'INSTALADO'

        if reception_data.confirmacion_encendido:
            db_equipment.fecha_vencimiento_garantia = reception_data.fecha_recepcion + timedelta(days=365)

        db.add(db_equipment)
        db.commit()
        db.refresh(db_equipment)

        log = LogEventos(
            equipo_id=equipment_id,
            evento="RECEPCION_EQUIPO",
            detalles={
                "status_anterior": status_anterior.value if status_anterior else None,
                "status_nuevo": "INSTALADO",
                "usuario_id": current_user.id,
                "garantia_activada": reception_data.confirmacion_encendido,
                "vencimiento_garantia": str(db_equipment.fecha_vencimiento_garantia) if db_equipment.fecha_vencimiento_garantia else None
            }
        )
        self.log_repo.create_log(db, log)

        return db_equipment

    def get_equipment_history(self, db: Session, equipment_id: int) -> List[LogEventos]:
        self.get_equipment_by_id(db, equipment_id)
        return self.log_repo.get_by_equipment_id(db, equipment_id)