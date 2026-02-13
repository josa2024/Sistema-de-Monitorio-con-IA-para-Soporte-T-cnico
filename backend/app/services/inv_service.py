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
        """
        Lógica de negocio para registrar un nuevo equipo.
        - Aplica la regla de negocio para el status.
        - Utiliza el repositorio para la persistencia.
        - Maneja errores específicos del dominio.
        """
        # Verificar si el cliente existe (Regla de Negocio Opcional pero Recomendada)
        cliente = db.query(User).filter(User.id == equipment_data.cliente_id).first()
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El cliente con ID {equipment_data.cliente_id} no existe."
            )

        try:
            # Crea una instancia del modelo SQLAlchemy, aplicando la "Regla de Oro"
            db_equipment = Equipo(
                **equipment_data.model_dump(),
                status='EN_TRANSITO',
                fecha_salida_sucursal=datetime.now()
            )
            
            # Delega la persistencia al repositorio
            created_equipment = self.equipment_repo.create_equipment_from_model(db=db, equipment_model=db_equipment)
            return created_equipment

        except IntegrityError:
            # Captura el error de la base de datos y lo transforma en una excepción HTTP.
            # Esto desacopla las capas: la API no necesita saber sobre errores de DB.
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El número de serie '{equipment_data.numero_serie}' ya existe."
            )

    def get_equipment_by_id(self, db: Session, equipment_id: int) -> Equipo:
        """
        Obtiene un equipo por ID. Lanza 404 si no existe.
        """
        equipment = self.equipment_repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipo no encontrado"
            )
        return equipment

    def list_equipments(self, db: Session, skip: int = 0, limit: int = 100) -> List[Equipo]:
        """Lista equipos con paginación."""
        return self.equipment_repo.get_all(db, skip=skip, limit=limit)

    def update_equipment(self, db: Session, equipment_id: int, equipment_update: EquipmentUpdate, current_user: User) -> Equipo:
        """
        Actualiza un equipo existente.
        """
        # 1. Obtener el equipo existente (reutilizamos el método que ya lanza 404 si no existe)
        db_equipment = self.get_equipment_by_id(db, equipment_id)

        # Capturar estado anterior para auditoría
        status_anterior = db_equipment.status

        # 2. Filtrar campos que no sean None (para no borrar datos accidentalmente)
        update_data = equipment_update.model_dump(exclude_unset=True)

        # 3. Persistir cambios
        updated_equipment = self.equipment_repo.update(db, db_obj=db_equipment, obj_in=update_data)

        # 4. Auditoría: Si cambió el estatus, registrar en LogEventos
        if "status" in update_data and update_data["status"] != status_anterior:
            log = LogEventos(
                equipo_id=equipment_id,
                evento="CAMBIO_ESTATUS",
                detalles={
                    "status_anterior": status_anterior,
                    "status_nuevo": update_data["status"],
                    "usuario_id": current_user.id
                }
            )
            self.log_repo.create_log(db, log)

        return updated_equipment

    def process_equipment_reception(self, db: Session, equipment_id: int, reception_data: EquipmentReception, current_user: User) -> Equipo:
        """
        Procesa la recepción física de un equipo.
        - Cambia estatus a INSTALADO.
        - Calcula garantía si enciende.
        - Genera log de auditoría.
        """
        # 1. Obtener el equipo
        db_equipment = self.get_equipment_by_id(db, equipment_id)
        status_anterior = db_equipment.status

        # 2. Actualizar datos de recepción
        db_equipment.estado_empaque = reception_data.estado_empaque
        db_equipment.confirmacion_encendido = reception_data.confirmacion_encendido
        db_equipment.fecha_recepcion = reception_data.fecha_recepcion
        
        # 3. Cambio de Estatus (Regla de Negocio)
        db_equipment.status = 'INSTALADO'

        # 4. Cálculo de Garantía (Regla de Negocio)
        if reception_data.confirmacion_encendido:
            db_equipment.fecha_vencimiento_garantia = reception_data.fecha_recepcion + timedelta(days=365)

        # 5. Persistir cambios
        db.add(db_equipment)
        db.commit()
        db.refresh(db_equipment)

        # 6. Auditoría
        log = LogEventos(
            equipo_id=equipment_id,
            evento="RECEPCION_EQUIPO",
            detalles={
                "status_anterior": status_anterior,
                "status_nuevo": "INSTALADO",
                "usuario_id": current_user.id,
                "garantia_activada": reception_data.confirmacion_encendido,
                "vencimiento_garantia": str(db_equipment.fecha_vencimiento_garantia) if db_equipment.fecha_vencimiento_garantia else None
            }
        )
        self.log_repo.create_log(db, log)

        return db_equipment

    def get_equipment_history(self, db: Session, equipment_id: int) -> List[LogEventos]:
        """Obtiene el historial de logs de un equipo."""
        # Verificar que el equipo existe (lanza 404 si no)
        self.get_equipment_by_id(db, equipment_id)
        return self.log_repo.get_by_equipment_id(db, equipment_id)
