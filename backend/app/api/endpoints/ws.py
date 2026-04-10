from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
import logging
from jose import jwt, JWTError
from sqlalchemy.orm import Session

# Importamos la instancia global de tu ConnectionManager
from app.core.websockets import manager
# Importamos dependencias y configuración para la validación del token
from app.api.deps import get_db
from app.core.config import settings
from app.models.user_models import User
from app.models.roles import RoleEnum


# Configuramos un logger básico
logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/tickets")
async def websocket_tickets_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Endpoint de WebSocket para escuchar eventos de los tickets en tiempo real.
    HU-02: Monitoreo de Anomalías.
    Ruta final: ws://tu-dominio.com/api/v1/ws/tickets (dependiendo de tu prefijo global)
    """
    # 0. Validar Token y Rol del usuario
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return

        user: User = db.query(User).filter(User.email == email).first()
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or inactive")
            return

        # HU-02 es para Técnicos. Solo permitimos la conexión a roles autorizados.
        if user.role.nombre not in [RoleEnum.ADMIN, RoleEnum.TECNICO]:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Insufficient permissions")
            return

    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 1. Aceptamos e incluimos la conexión en el manager
    await manager.connect(websocket)
    logger.info(f"Técnico '{user.email}' (ID: {user.id}) conectado al WebSocket de tickets.")
    
    try:
        # 2. Bucle infinito para mantener la conexión viva
        while True:
            # Mantenemos el canal abierto y detectamos desconexiones.
            # El servidor usará manager.broadcast() desde los Servicios para enviar alertas.
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        # 3. Manejo limpio cuando el cliente cierra la pestaña
        manager.disconnect(websocket)
        logger.info(f"Técnico '{user.email}' (ID: {user.id}) se ha desconectado del WebSocket.")