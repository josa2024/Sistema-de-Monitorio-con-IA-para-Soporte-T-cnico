from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websockets import manager

router = APIRouter()

@router.websocket("/tickets")
async def websocket_endpoint(websocket: WebSocket):
    """
    Endpoint de WebSocket para notificaciones de tickets.
    Acepta conexiones y las mantiene vivas para recibir broadcasts del servidor.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Mantenemos la conexión abierta. El `receive_text` sirve principalmente
            # para detectar de forma estándar cuando el cliente se desconecta.
            # El cliente no necesita enviar datos, solo escuchar.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Opcional: puedes agregar un log aquí para saber cuándo se desconecta un cliente.