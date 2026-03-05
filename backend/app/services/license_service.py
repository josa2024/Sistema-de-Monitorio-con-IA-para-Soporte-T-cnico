
from datetime import date, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session
from app.models.license_models import License, LicenseType
from app.schemas.license import LicenseCreate

class LicenseService:
    """
    Capa de servicio para la lógica de negocio relacionada con las licencias.
    Está diseñada para ser independiente de la capa de API (FastAPI) y de la capa de tareas (Celery),
    siguiendo principios de código limpio y separación de responsabilidades.
    """

    def register_license(self, db: Session, license_in: LicenseCreate) -> License:
        """
        Registra una nueva licencia en la base de datos.
        Calcula automáticamente la fecha de vencimiento para las licencias de tipo 'Suscripcion'.

        Args:
            db (Session): Sesión de base de datos de SQLAlchemy.
            license_in (LicenseCreate): Esquema Pydantic con los datos de la licencia a crear.

        Returns:
            License: El objeto de modelo SQLAlchemy de la licencia creada.
        """
        fecha_vencimiento = None
        if license_in.tipo_licencia == LicenseType.Suscripcion:
            # Lógica de negocio: las suscripciones por defecto duran 1 año.
            # Esto podría venir de la configuración o ser más complejo.
            fecha_vencimiento = license_in.fecha_inicio + timedelta(days=365)

        db_license = License(
            equipment_id=license_in.equipment_id,
            nombre_software=license_in.nombre_software,
            tipo_licencia=license_in.tipo_licencia,
            fecha_inicio=license_in.fecha_inicio,
            fecha_vencimiento=fecha_vencimiento,
            clave_producto=license_in.clave_producto,
            archivo_url=license_in.archivo_url,
        )
        db.add(db_license)
        db.commit()
        db.refresh(db_license)
        return db_license

    def get_expiring_licenses(self, db: Session, days_threshold: int) -> List[License]:
        """
        Consulta la base de datos para encontrar licencias que vencerán en una fecha específica.

        Args:
            db (Session): Sesión de base de datos de SQLAlchemy.
            days_threshold (int): El número exacto de días en el futuro para revisar el vencimiento.

        Returns:
            List[License]: Una lista de objetos de licencia que cumplen con el criterio.
        """
        expiration_date = date.today() + timedelta(days=days_threshold)
        
        return db.query(License).filter(
            License.fecha_vencimiento == expiration_date,
            License.tipo_licencia == LicenseType.Suscripcion
        ).all()

license_service = LicenseService()
