from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta

# Importamos los modelos de la base de datos
from app.models.equipment_models import Equipo
from app.models.ticket import Ticket

# Importamos los schemas de respuesta
from app.schemas.dashboard import DashboardKpisOut, KpiItem


class DashboardService:
    """
    Servicio para calcular y obtener las métricas del Dashboard Administrativo.
    """

    def get_kpis(self, db: Session) -> DashboardKpisOut:
        """
        Calcula los KPIs utilizando consultas de agregación de SQLAlchemy.
        """
        # 1. KPI: Total de equipos instalados vs. en tránsito
        equipment_results = (
            db.query(Equipo.estado, func.count(Equipo.id).label("count"))
            .group_by(Equipo.estado)
            .all()
        )
        equipment_summary = [
            KpiItem(name=status, count=count) for status, count in equipment_results
        ]

        # 2. KPI: Tickets abiertos vs. cerrados HOY
        today = datetime.now().date()
        tickets_results = (
            db.query(Ticket.estado, func.count(Ticket.id).label("count"))
            .filter(cast(Ticket.fecha_creacion, Date) == today)
            .group_by(Ticket.estado)
            .all()
        )
        # Asumimos que Ticket.estado es un Enum, por eso usamos .value
        tickets_today_summary = [
            KpiItem(name=status.value, count=count) for status, count in tickets_results
        ]

        # 3. KPI: Conteo de equipos con garantía próxima a vencer (próximos 30 días)
        WARRANTY_PERIOD_DAYS = 365
        DAYS_THRESHOLD = 30
        now = datetime.now()

        # La garantía vence si la fecha de inicio está entre (hoy - 365 días) y (hoy - 365 + 30 días)
        min_start_date = now - timedelta(days=WARRANTY_PERIOD_DAYS)
        max_start_date = min_start_date + timedelta(days=DAYS_THRESHOLD)

        warranties_count = db.query(func.count(Equipo.id)).filter(
            Equipo.fecha_inicio_garantia.isnot(None),
            Equipo.fecha_inicio_garantia.between(min_start_date, max_start_date)
        ).scalar() or 0

        return DashboardKpisOut(
            equipment_summary=equipment_summary,
            tickets_today_summary=tickets_today_summary,
            warranties_expiring_soon_count=warranties_count,
        )