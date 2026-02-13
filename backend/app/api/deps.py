from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user_models import User

# Configuración de OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/login/access-token")


def get_db() -> Generator:
    """Generador de sesiones de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Valida el token JWT y recupera el usuario actual."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Verifica que el usuario tenga rol de ADMIN."""
    if not current_user.role or current_user.role.nombre != "ADMIN":
        raise HTTPException(
            status_code=403, detail="El usuario no tiene privilegios suficientes"
        )
    return current_user
