from sqlalchemy.orm import Session
from typing import List
from app.models.log import LogEventos

class LogRepository:
    def create_log(self, db: Session, log: LogEventos) -> LogEventos:
        """
        Registra un nuevo evento de auditoría en la base de datos.
        """
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def get_by_equipment_id(self, db: Session, equipment_id: int) -> List[LogEventos]:
        """
        Obtiene el historial completo de eventos de un equipo específico.
        """
        return db.query(LogEventos).filter(LogEventos.equipo_id == equipment_id).order_by(LogEventos.fecha.desc()).all()