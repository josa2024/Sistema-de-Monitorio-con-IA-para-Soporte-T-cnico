
from typing import Dict, Any
from datetime import date
from app.models.license_models import License

class NotificationService:
    """
    Capa de servicio para el envío de notificaciones.
    Actualmente, contiene un mock para simular el envío de alertas.
    En una implementación real, esta clase interactuaría con un sistema de mensajería,
    WebSockets, correos electrónicos, etc.
    """

    def send_preventive_alert(self, license_data: License):
        """
        Simula el envío de una alerta preventiva sobre una licencia que está por vencer.

        En una implementación futura, esta función haría lo siguiente:
        1.  Formatear un mensaje/payload en formato JSON con los detalles de la licencia
            y el nivel de prioridad de la alerta (ej. 'alta' para 7 días, 'media' para 15).
        2.  Obtener el ID del técnico o grupo de técnicos que deben recibir la notificación,
            posiblemente a través del `license_data.equipo.cliente_id` o una tabla de asignaciones.
        3.  Usar el 'ConnectionManager' de WebSockets (que estaría en `app.core.websockets`)
            para enviar el payload JSON directamente al dashboard de los técnicos conectados.
            Ej: await manager.send_personal_message(payload, technician_id)

        Args:
            license_data (License): El objeto de la licencia próxima a vencer.
        """
        # --- INICIO DEL MOCK ---
        # Simplemente imprimimos en consola para verificar que la tarea de Celery lo llama.
        print("-" * 20)
        print("SIMULANDO ENVÍO DE ALERTA PREVENTIVA VÍA WEBSOCKETS")
        print(f"Licencia ID: {license_data.id}")
        print(f"Software: {license_data.nombre_software}")
        print(f"Equipo ID: {license_data.equipment_id}")
        print(f"Cliente ID: {license_data.equipo.cliente_id if license_data.equipo else 'N/A'}")
        print(f"Fecha de Vencimiento: {license_data.fecha_vencimiento}")
        
        # Lógica para determinar la prioridad basada en la fecha de vencimiento
        days_to_expire = (license_data.fecha_vencimiento - date.today()).days
        priority = "alta"
        if days_to_expire > 15:
            priority = "baja"
        elif days_to_expire > 7:
            priority = "media"

        print(f"Prioridad de Alerta: {priority}")
        print("-" * 20)
        # --- FIN DEL MOCK ---

        # En el futuro, aquí se construiría el payload y se llamaría al WebSocket manager.
        payload = {
            "type": "license_expiry_alert",
            "data": {
                "license_id": license_data.id,
                "equipment_id": license_data.equipment_id,
                "software": license_data.nombre_software,
                "client_id": license_data.equipo.cliente_id if license_data.equipo else None,
                "expires_in_days": days_to_expire,
                "priority": priority,
            }
        }
        # Ejemplo de llamada futura:
        # from app.core.websockets import manager
        # await manager.broadcast(payload) # O enviar a un usuario específico

notification_service = NotificationService()
