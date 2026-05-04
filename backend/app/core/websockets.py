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
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Envía un mensaje JSON a todas las conexiones activas, manejando desconexiones abruptas."""
        print(f"Broadcasting message: {message} to {len(self.active_connections)} connections")
        dead_connections = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Si la conexión falla (ej. el cliente cerró el navegador de golpe),
                # la agregamos a la lista de conexiones muertas para no interrumpir a los demás.
                dead_connections.append(connection)
                
        # Limpiamos las conexiones que ya no son válidas
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

# Instancia global para ser usada en toda la aplicación
manager = ConnectionManager()