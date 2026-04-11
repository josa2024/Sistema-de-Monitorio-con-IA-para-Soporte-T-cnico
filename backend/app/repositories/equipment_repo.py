from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.equipment_models import Equipo

class EquipmentRepository:
    def create_equipment_from_model(self, db: Session, *, equipment_model: Equipo) -> Equipo:
        """
        Persiste un objeto de equipo en la base de datos.
        Este método asume que el objeto ya fue construido con toda la
        lógica de negocio necesaria.
        """
        db.add(equipment_model)
        db.commit()
        db.refresh(equipment_model)
        return equipment_model

    def get_by_id(self, db: Session, equipment_id: int) -> Equipo | None:
        """Busca un equipo por su ID primario."""
        # SQLAlchemy 2.0 syntax
        stmt = select(Equipo).where(Equipo.id == equipment_id)
        return db.execute(stmt).scalar_one_or_none()

    def get_by_serial(self, db: Session, serial: str) -> Equipo | None:
        """Busca un equipo por su número de serie de manera óptima."""
        # SQLAlchemy 2.0 syntax
        stmt = select(Equipo).where(Equipo.numero_serie == serial)
        return db.execute(stmt).scalar_one_or_none()

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> list[Equipo]:
        """Recupera una lista de equipos con paginación."""
        stmt = select(Equipo).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    def update(self, db: Session, *, db_obj: Equipo, obj_in: dict) -> Equipo:
        """Actualiza los campos de un equipo existente."""
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, db_obj: Equipo) -> None:
        """Elimina un equipo de la base de datos."""
        from app.models.equipment_models import EquipmentLog, GarantiaLicencia
        from app.models.ticket import Ticket, TicketLog, ComentarioTicket, TicketAttachment
        from app.models.license_models import License
        
        # Obtenemos los IDs de los tickets asociados para eliminar sus dependencias (hijos)
        tickets = db.query(Ticket.id).filter(Ticket.equipo_id == db_obj.id).all()
        ticket_ids = [t[0] for t in tickets]
        
        if ticket_ids:
            db.query(TicketLog).filter(TicketLog.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)
            db.query(ComentarioTicket).filter(ComentarioTicket.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)
            db.query(TicketAttachment).filter(TicketAttachment.ticket_id.in_(ticket_ids)).delete(synchronize_session=False)

        # Eliminamos manualmente los registros asociados para evitar excepciones NotNullViolation
        # por falta de cascade="all, delete-orphan" en los modelos
        db.query(EquipmentLog).filter(EquipmentLog.equipo_id == db_obj.id).delete(synchronize_session=False)
        db.query(GarantiaLicencia).filter(GarantiaLicencia.equipo_id == db_obj.id).delete(synchronize_session=False)
        db.query(Ticket).filter(Ticket.equipo_id == db_obj.id).delete(synchronize_session=False)
        db.query(License).filter(License.equipment_id == db_obj.id).delete(synchronize_session=False)
        
        db.delete(db_obj)
        db.commit()
