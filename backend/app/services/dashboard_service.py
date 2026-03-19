import json
from datetime import datetime, timedelta

import redis
from sqlalchemy import func, desc, extract
from sqlalchemy.orm import Session

# Importación de modelos y configuraciones
from app.core.config import settings
from app.models.equipment_models import Equipo, SeguimientoInstalacion, StatusEquipo
from app.models.ticket import Ticket
from app.schemas import dashboard as dashboard_schema  # Para los schemas de respuesta


class DashboardService:
    """
    Servicio para calcular y obtener métricas avanzadas y datos históricos
    para el Dashboard Administrativo, con soporte para caché en Redis.
    """
    _redis_client: redis.Redis
    CACHE_KEY_KPIS = "dashboard:kpis"
    CACHE_TTL_SECONDS = 600  # 10 minutos

    def __init__(self):
        # Correcta inicialización del cliente de Redis.
        # Usamos la variable de entorno REDIS_URL que está dedicada para esto,
        # en lugar de reutilizar la de Celery.
        self._redis_client = redis.from_url(settings.REDIS_URL)

    def get_advanced_kpis(self, db: Session) -> dashboard_schema.AdvancedKpisOut:
        """
        Calcula KPIs avanzados. Intenta obtenerlos desde el caché de Redis primero.
        Si no están en caché, los calcula, los guarda y los retorna.
        """
        try:
            cached_kpis = self._redis_client.get(self.CACHE_KEY_KPIS)
            if cached_kpis:
                # Si encontramos datos en caché, los decodificamos y retornamos
                return dashboard_schema.AdvancedKpisOut.model_validate_json(cached_kpis)
        except redis.exceptions.ConnectionError:
            # Si Redis no está disponible, simplemente calculamos los datos sin caché.
            # En un entorno de producción, aquí se registraría un log de advertencia.
            pass

        # --- Si no hay caché, calculamos las métricas ---

        # 1. Tiempo promedio de instalación en días
        # Se usa extract('epoch', ...) para compatibilidad con PostgreSQL.
        # Esto calcula la diferencia en segundos.
        avg_install_time_seconds = db.query(
            func.avg(
                extract('epoch', SeguimientoInstalacion.fecha_registro) -
                extract('epoch', SeguimientoInstalacion.fecha_recepcion)
            )
        ).join(Equipo, Equipo.id == SeguimientoInstalacion.equipment_id)\
         .filter(Equipo.status == StatusEquipo.INSTALADO)\
         .filter(SeguimientoInstalacion.fecha_registro.isnot(None))\
         .scalar() or 0
        
        # Convertimos el promedio de segundos a días
        avg_install_time_days = avg_install_time_seconds / (24 * 3600)

        # 2. Top 5 de fallas más comunes
        top_failures = db.query(
            Ticket.titulo,
            func.count(Ticket.id).label("count")
        ).group_by(Ticket.titulo).order_by(desc("count")).limit(5).all()

        # 3. Distribución del estado actual de equipos
        equipment_status_distribution = db.query(
            Equipo.status,
            func.count(Equipo.id).label("count")
        ).group_by(Equipo.status).all()

        # Damos formato a la respuesta usando el schema Pydantic
        kpis_data = dashboard_schema.AdvancedKpisOut(
            average_installation_time_days=round(avg_install_time_days, 2),
            top_common_failures=[
                dashboard_schema.TopFailureItem(failure=title, count=count)
                for title, count in top_failures
            ],
            equipment_status_distribution=[
                dashboard_schema.StatusDistributionItem(status=status.value, count=count)
                for status, count in equipment_status_distribution
            ]
        )

        # Guardamos el resultado en caché por 10 minutos
        try:
            self._redis_client.setex(
                self.CACHE_KEY_KPIS,
                self.CACHE_TTL_SECONDS,
                kpis_data.model_dump_json()
            )
        except redis.exceptions.ConnectionError:
            # Ignoramos el error si no se pudo guardar en caché
            pass

        return kpis_data

    def get_historical_data(self, db: Session) -> dashboard_schema.HistoricalDataOut:
        """
        Calcula datos históricos para gráficos de series de tiempo.
        Estos datos no se cachean para reflejar la información más reciente.
        """
        # 1. Volumen de tickets creados por mes (últimos 12 meses)
        one_year_ago = datetime.now() - timedelta(days=365)
        tickets_by_month_query = db.query(
            extract('year', Ticket.fecha_creacion).label('year'),
            extract('month', Ticket.fecha_creacion).label('month'),
            func.count(Ticket.id).label('count')
        ).filter(Ticket.fecha_creacion >= one_year_ago)\
         .group_by('year', 'month')\
         .order_by('year', 'month')\
         .all()
        
        tickets_by_month = [
            dashboard_schema.TimeSeriesItem(
                date=f"{int(year)}-{int(month):02d}", 
                count=count
            )
            for year, month, count in tickets_by_month_query
        ]

        # 2. Volumen de equipos instalados en los últimos 30 días (agrupado por día)
        thirty_days_ago = datetime.now().date() - timedelta(days=30)
        installed_last_30_days_query = db.query(
            func.date(SeguimientoInstalacion.fecha_registro).label('installation_date'),
            func.count(SeguimientoInstalacion.id).label('count')
        ).join(Equipo)\
         .filter(Equipo.status == StatusEquipo.INSTALADO)\
         .filter(func.date(SeguimientoInstalacion.fecha_registro) >= thirty_days_ago)\
         .group_by('installation_date')\
         .order_by('installation_date')\
         .all()

        installed_last_30_days = [
            dashboard_schema.TimeSeriesItem(date=str(date), count=count)
            for date, count in installed_last_30_days_query
        ]
        
        return dashboard_schema.HistoricalDataOut(
            tickets_created_by_month=tickets_by_month,
            equipment_installed_last_30_days=installed_last_30_days
        )
