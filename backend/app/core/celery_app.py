
from celery import Celery
from celery.schedules import crontab
import os

# Lee las URLs de Redis desde las variables de entorno.
# Es una buena práctica configurar esto externamente para no hardcodear credenciales.
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Inicialización de la aplicación Celery.
# El primer argumento 'innotrev' es el nombre del módulo actual.
celery_app = Celery(
    "innotrev",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.license_tasks"],  # Importa automáticamente las tareas desde este módulo.
)

# Configuración opcional de Celery, puedes ajustar según tus necesidades.
celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

# Configuración de Celery Beat para ejecutar tareas programadas.
# Aquí definimos una tarea periódica que se ejecutará todos los días a medianoche.
celery_app.conf.beat_schedule = {
    'check-expiring-licenses-every-day': {
        'task': 'app.tasks.license_tasks.check_expiring_licenses_task',
        'schedule': crontab(hour=0, minute=0),  # Ejecutar a las 00:00 horas.
    },
}

celery_app.autodiscover_tasks(lambda: ["app.tasks"])

if __name__ == "__main__":
    celery_app.start()
