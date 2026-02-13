from datetime import date, datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from fastapi import Depends

from app.models.equipment_models import Equipo
from app.models.license import License
from app.api.dashboard import ExpirationAlert

class DashboardService:
    def get_unified_expirations(self, db: Session, days_threshold: int = 30) -> List[ExpirationAlert]:
        """
        Consulta garantías de equipos y licencias de software, las normaliza
        y devuelve una lista unificada ordenada por urgencia.
        """
        today = date.today()
        limit_date = today + timedelta(days=days_threshold)
        
        alerts = []

        # --- 1. Procesar Garantías de Hardware (Equipos) ---
        # Buscamos equipos instalados que tengan fecha de garantía definida
        equipos = db.query(Equipo).filter(
            Equipo.status == 'INSTALADO',
            Equipo.fecha_vencimiento_garantia != None
        ).all()

        for eq in equipos:
            # Normalización: Equipo usa datetime, necesitamos date para comparar
            vencimiento = eq.fecha_vencimiento_garantia.date() if isinstance(eq.fecha_vencimiento_garantia, datetime) else eq.fecha_vencimiento_garantia
            
            # Filtramos en memoria para manejar la conversión de tipos limpiamente
            if today <= vencimiento <= limit_date:
                delta = (vencimiento - today).days
                
                prioridad = "NORMAL"
                if delta < 7:
                    prioridad = "CRITICA"
                elif delta < 30:
                    prioridad = "ALERTA"

                alerts.append(ExpirationAlert(
                    id=eq.id,
                    tipo="HARDWARE",
                    nombre=f"{eq.modelo} (Garantía)",
                    referencia=eq.numero_serie,
                    fecha_vencimiento=vencimiento,
                    dias_restantes=delta,
                    prioridad=prioridad
                ))

        # --- 2. Procesar Licencias de Software ---
        licencias = db.query(License).filter(
            License.fecha_vencimiento >= today,
            License.fecha_vencimiento <= limit_date
        ).all()

        for lic in licencias:
            vencimiento = lic.fecha_vencimiento
            delta = (vencimiento - today).days
            
            prioridad = "NORMAL"
            if delta < 7:
                prioridad = "CRITICA"
            elif delta < 30:
                prioridad = "ALERTA"

            alerts.append(ExpirationAlert(
                id=lic.id,
                tipo="SOFTWARE",
                nombre=lic.nombre_software,
                referencia=lic.licencia_key,
                fecha_vencimiento=vencimiento,
                dias_restantes=delta,
                prioridad=prioridad
            ))

        # --- 3. Ordenamiento Unificado ---
        # Ordenamos por urgencia (menor cantidad de días restantes primero)
        alerts.sort(key=lambda x: x.dias_restantes)
        
        return alerts