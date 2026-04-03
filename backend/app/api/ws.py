from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
import logging

from app.core.config import settings
from app.core.websockets import manager
from app.api import deps
from app.models.user_models import User

# Configuramos un logger básico para ver las conexiones en la consola
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ws",
    tags=["websockets"]
)

@router.websocket("/tickets")
async def websocket_tickets_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    Endpoint de WebSocket para escuchar eventos de los tickets en tiempo real.
    Ruta final: ws://tu-dominio.com/ws/tickets?token=<JWT>
    """

    # --- Autenticación JWT desde query param ---
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise JWTError("Token inválido")
    except JWTError as e:
        logger.warning(f"WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verificamos que el usuario exista y esté activo
    db = next(deps.get_db())
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.is_active:
            logger.warning(f"WebSocket auth user no found/disabled: {email}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    finally:
        db.close()

    await manager.connect(websocket)
    logger.info(f"Usuario conectado WS tickets: {email}")

    try:
        while True:
            try:
                data = await websocket.receive_text()
                if data.strip().lower() == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.debug(f"WebSocket receive exception: {e}")
                continue

    finally:
        manager.disconnect(websocket)
        logger.info(f"Usuario desconectado WS tickets: {email}")