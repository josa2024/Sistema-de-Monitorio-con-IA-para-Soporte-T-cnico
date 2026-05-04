
from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.license_service import license_service
from app.services.notification_service import notification_service
from typing import List

@celery_app.task(name="app.tasks.license_tasks.check_expiring_licenses_task")
def check_expiring_licenses_task():
    """
    Tarea de Celery para verificar licencias próximas a vencer.
    Esta tarea se ejecuta de forma asíncrona y periódica gracias a Celery Beat.
    Es crucial que gestione su propia sesión de base de datos, ya que se ejecuta
    fuera del ciclo de vida de una solicitud HTTP de FastAPI.
    """
    print("Ejecutando tarea de revisión de licencias...")
    db = SessionLocal()
    try:
        # Los umbrales de días para notificar. Podrían venir de una configuración.
        days_thresholds = [30, 15, 7]
        expiring_licenses = []

        for days in days_thresholds:
            licenses_found = license_service.get_expiring_licenses(db, days_threshold=days)
            if licenses_found:
                expiring_licenses.extend(licenses_found)
                print(f"Se encontraron {len(licenses_found)} licencias que vencen en {days} días.")

        # Por cada licencia encontrada, se envía una alerta.
        for license_obj in expiring_licenses:
            notification_service.send_preventive_alert(license_data=license_obj)

    finally:
        # Es fundamental cerrar la sesión de la base de datos para liberar la conexión.
        db.close()
        print("Tarea de revisión de licencias finalizada.")

    return f"Se procesaron {len(expiring_licenses)} licencias próximas a vencer."

