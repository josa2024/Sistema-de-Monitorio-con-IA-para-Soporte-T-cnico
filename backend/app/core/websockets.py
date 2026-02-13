from typing import List
from fastapi import WebSocket

class ConnectionManager:
    """
    Gestiona las conexiones WebSocket activas.
    Permite aceptar, desconectar y enviar mensajes (broadcast) a todos los clientes.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Acepta una nueva conexión WebSocket y la agrega a la lista de activas."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """Remueve una conexión WebSocket de la lista de activas."""
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Envía un mensaje JSON a todas las conexiones activas."""
        for connection in self.active_connections:
            await connection.send_json(message)

# Instancia global para ser usada en toda la aplicación
manager = ConnectionManager()