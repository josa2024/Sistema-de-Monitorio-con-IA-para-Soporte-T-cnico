from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.notification_service import manager 

router = APIRouter()

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    """
    Canal de WebSocket para el Dashboard de Técnicos.
    Escucha alertas de anomalías en tiempo real.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Mantenemos la conexión viva
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)