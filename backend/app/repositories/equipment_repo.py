from sqlalchemy.orm import Session
from typing import List, Optional, Type
from app.models.equipment_models import Equipo

class EquipmentRepository:
    def create_equipment_from_model(self, db: Session, *, equipment_model: Equipo) -> Equipo:
        """
        Persiste un objeto de equipo en la base de datos.
        Este método asume que el objeto ya fue construido con toda la
        lógica de negocio necesaria (como el status) en la capa de servicio.
        La excepción de integridad (numero_serie duplicado) se propagará
        para ser manejada en una capa superior.
        """
        db.add(equipment_model)
        db.commit()
        db.refresh(equipment_model)
        return equipment_model

    def get_by_id(self, db: Session, equipment_id: int) -> Optional[Equipo]:
        """Busca un equipo por su ID primario."""
        return db.query(Equipo).filter(Equipo.id == equipment_id).first()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Type[Equipo]]:
        """Recupera una lista de equipos con paginación."""
        return db.query(Equipo).offset(skip).limit(limit).all()

    def update(self, db: Session, *, db_obj: Equipo, obj_in: dict) -> Equipo:
        """Actualiza los campos de un equipo existente."""
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
