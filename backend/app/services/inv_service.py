import os
import shutil
from datetime import datetime, timedelta
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.equipment_repo import EquipmentRepository
from app.models.equipment_models import Equipo
from app.models.equipment_models import EquipmentLog # Asumiendo que existe este modelo
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentReception
from app.models.user_models import User
from typing import List

class InventoryService:
    def __init__(self):
        # Inyección de dependencias del repositorio
        self.repo = EquipmentRepository()

    def process_equipment_reception(
        self, 
        db: Session, 
        equipment_id: int, 
        reception_data: EquipmentReception, 
        current_user: User,
        file: Optional[UploadFile] = None # Agregamos el archivo como parámetro real
    ) -> Equipo:
        """
        HU-01: Procesa el reporte de instalación manual del cliente.
        Valida el estado actual, guarda evidencia y activa la garantía.
        """
        # 1. Obtener el equipo
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )

        # Validar propiedad del equipo (Seguridad)
        # Asumimos que current_user tiene id y equipment tiene cliente_id
        if equipment.cliente_id != current_user.id:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para gestionar este equipo."
            )

        # 2. Validar reglas de negocio
        # El equipo debe estar en tránsito para poder ser instalado por el cliente.
        if equipment.estado != "EN_TRANSITO":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El equipo no puede ser instalado porque su estado actual es: {equipment.estado}"
            )

        # 3. Manejo de archivo de evidencia (Opcional)
        evidencia_url = getattr(reception_data, "evidencia_url", None)
        
        if file:
            # Definimos una carpeta local para uploads
            upload_dir = "uploads/evidence"
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generamos un nombre único
            timestamp = int(datetime.now().timestamp())
            filename = f"{equipment_id}_{timestamp}_{file.filename}"
            file_path = os.path.join(upload_dir, filename)
            
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                evidencia_url = file_path
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al guardar la evidencia fotográfica."
                )

        # 4. Preparar datos de actualización
        # Mapeamos los datos del reporte y forzamos el cambio de estado
        update_data = {
            "fecha_recepcion": reception_data.fecha_recepcion,
            "estado_empaque": reception_data.estado_empaque,
            "encendio_correctamente": reception_data.encendio_correctamente,
            "observaciones": reception_data.observaciones,
            "estado": "INSTALADO",  # HU-01: Cambio de estado automático
            "fecha_instalacion": datetime.now(),
            "fecha_inicio_garantia": datetime.now() # HU-01: Comienza a correr la garantía
        }

        if evidencia_url:
            update_data["url_evidencia"] = evidencia_url

        # 5. Persistir cambios mediante el repositorio
        updated_equipment = self.repo.update(db, db_obj=equipment, obj_in=update_data)

        # 6. Crear Log de Auditoría (Historial)
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

    def register_new_equipment(self, db: Session, equipment_data: EquipmentCreate) -> Equipo:
        """
        RF: Gestión de Inventario. Crea un nuevo equipo en base de datos.
        """
        data = equipment_data.dict()
        
        # Estado inicial por defecto si no se provee
        if "estado" not in data:
            data["estado"] = "EN_TRANSITO"

        equipment_model = Equipo(**data)
        return self.repo.create_equipment_from_model(db, equipment_model=equipment_model)

    def list_equipments(self, db: Session, skip: int = 0, limit: int = 100) -> List[Equipo]:
        """
        Lista todos los equipos con paginación.
        """
        return db.query(Equipo).offset(skip).limit(limit).all()

    def get_equipment_by_id(self, db: Session, equipment_id: int) -> Equipo:
        """
        Obtiene un equipo por su ID, lanzando excepción si no existe.
        """
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )
        return equipment

    def update_equipment(
        self, 
        db: Session, 
        equipment_id: int, 
        equipment_update: EquipmentUpdate, 
        current_user: User
    ) -> Equipo:
        """
        Actualiza los datos generales de un equipo.
        """
        equipment = self.get_equipment_by_id(db, equipment_id)
        
        # Excluimos los valores no seteados para no sobrescribir con null
        update_data = equipment_update.dict(exclude_unset=True)
        
        return self.repo.update(db, db_obj=equipment, obj_in=update_data)

    def get_equipment_history(self, db: Session, equipment_id: int) -> List:
        """
        Obtiene la bitácora de eventos (logs) de un equipo específico.
        """
        equipment = self.repo.get_by_id(db, equipment_id)
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Equipo con ID {equipment_id} no encontrado."
            )
        
        # Retorna la relación de logs asociada al equipo
        return equipment.logs

    def get_warranty_alerts(self, db: Session, days_threshold: int = 30) -> List[Equipo]:
        """
        RF: Control de Garantías.
        Identifica y retorna los equipos cuya garantía vencerá en los próximos 'days_threshold' días.
        Regla de negocio: La garantía es válida por 365 días a partir de la fecha de inicio.
        """
        WARRANTY_PERIOD_DAYS = 365
        now = datetime.now()
        
        # Calculamos el rango de fechas de inicio que resultarían en un vencimiento dentro del umbral.
        # Fecha Vencimiento = Fecha Inicio + 365
        # Queremos: Hoy <= Fecha Vencimiento <= Hoy + Umbral
        min_start_date = now - timedelta(days=WARRANTY_PERIOD_DAYS)
        max_start_date = min_start_date + timedelta(days=days_threshold)
        
        return db.query(Equipo).filter(
            Equipo.fecha_inicio_garantia.isnot(None),
            Equipo.fecha_inicio_garantia >= min_start_date,
            Equipo.fecha_inicio_garantia <= max_start_date
        ).all()