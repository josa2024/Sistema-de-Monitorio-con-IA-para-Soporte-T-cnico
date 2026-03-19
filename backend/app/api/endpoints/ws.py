from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
import logging

# Importamos la instancia global de tu ConnectionManager
from app.core.websockets import manager
# Importamos dependencias de seguridad (ajusta la ruta según tu estructura de auth)
from app.api import deps 

# Configuramos un logger básico
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/tickets")
async def websocket_tickets_endpoint(
    websocket: WebSocket,
    token: str = Query(...) 
):
    """
    Endpoint de WebSocket para escuchar eventos de los tickets en tiempo real.
    HU-02: Monitoreo de Anomalías.
    Ruta final: ws://tu-dominio.com/api/v1/ws/tickets (dependiendo de tu prefijo global)
    """
    # 0. Validar Token (Pseudo-código, depende de tu implementación exacta de deps.get_current_user)
    try:
        # Simulamos validación. En producción usarías tu función de decodificar JWT
        # user = deps.get_current_user_from_token(token)
        pass 
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 1. Aceptamos e incluimos la conexión en el manager
    await manager.connect(websocket)
    logger.info("Nuevo cliente conectado al WebSocket de tickets.")
    
    try:
        # 2. Bucle infinito para mantener la conexión viva
        while True:
            # Mantenemos el canal abierto y detectamos desconexiones.
            # El servidor usará manager.broadcast() desde los Servicios para enviar alertas.
            data = await websocket.receive_text()
            
            # Opcional: Procesar comandos entrantes si fuera necesario
            # logger.debug(f"Mensaje recibido del cliente: {data}")
            
    except WebSocketDisconnect:
        # 3. Manejo limpio cuando el cliente cierra la pestaña
        manager.disconnect(websocket)
        logger.info("Un cliente se ha desconectado del WebSocket de tickets.")