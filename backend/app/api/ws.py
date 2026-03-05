from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

# Importamos la instancia global de tu ConnectionManager
from app.core.websockets import manager

# Configuramos un logger básico para ver las conexiones en la consola
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ws",
    tags=["websockets"]
)

@router.websocket("/tickets")
async def websocket_tickets_endpoint(websocket: WebSocket):
    """
    Endpoint de WebSocket para escuchar eventos de los tickets en tiempo real.
    Ruta final: ws://tu-dominio.com/ws/tickets
    """
    # 1. Aceptamos e incluimos la conexión en el manager
    await manager.connect(websocket)
    logger.info("Nuevo cliente conectado al WebSocket de tickets.")
    
    try:
        # 2. Bucle infinito para mantener la conexión viva
        while True:
            # Aunque nuestro propósito principal es ENVIAR (broadcast) notificaciones
            # desde el servidor al cliente, necesitamos este 'receive_text()' para 
            # mantener el canal abierto y detectar cuando el cliente se desconecta.
            data = await websocket.receive_text()
            
            # Opcional: Si necesitas que el cliente también envíe comandos al servidor, 
            # puedes procesar la variable 'data' aquí.
            # logger.debug(f"Mensaje recibido del cliente: {data}")
            
    except WebSocketDisconnect:
        # 3. Manejo limpio cuando el cliente cierra la pestaña o pierde conexión
        manager.disconnect(websocket)
        logger.info("Un cliente se ha desconectado del WebSocket de tickets.")