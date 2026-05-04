
from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session
from app.models.equipment_models import GarantiaLicencia, TipoGarantia
from app.schemas.license import LicenseCreate

class LicenseService:
    """
    Capa de servicio para la lógica de negocio relacionada con las licencias.
    Está diseñada para ser independiente de la capa de API (FastAPI) y de la capa de tareas (Celery),
    siguiendo principios de código limpio y separación de responsabilidades.
    """

    def get_expiring_licenses(self, db: Session, days_threshold: int) -> List[GarantiaLicencia]:
        """
        Consulta la base de datos para encontrar licencias que vencerán en una fecha específica.

        Args:
            db (Session): Sesión de base de datos de SQLAlchemy.
            days_threshold (int): El número exacto de días en el futuro para revisar el vencimiento.

        Returns:
            List[GarantiaLicencia]: Una lista de objetos de garantía/licencia que cumplen con el criterio.
        """
        expiration_date = date.today() + timedelta(days=days_threshold)
        
        return db.query(GarantiaLicencia).filter(
            GarantiaLicencia.fecha_vencimiento == expiration_date,
            GarantiaLicencia.tipo == TipoGarantia.SOFTWARE
        ).all()

license_service = LicenseService()
