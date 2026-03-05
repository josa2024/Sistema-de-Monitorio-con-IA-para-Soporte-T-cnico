from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user_models import User
from app.models.roles import RoleEnum

# CORRECCIÓN 1: Apuntamos exactamente a la ruta real de tu endpoint de login.
# Si tu main.py agrupa todo bajo un prefijo (ej. "/api/v1"), la ruta debe ser "/api/v1/auth/login/access-token"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/access-token") 


def get_db() -> Generator:
    """Generador de sesiones de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Valida el token JWT y recupera el usuario actual."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        # Aquí estamos esperando el email en el 'sub' del token
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario actual esté activo."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Verifica que el usuario tenga rol de ADMIN."""
    if not current_user.role or current_user.role.nombre != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=403, detail="The user does not have enough privileges"
        )
    return current_user

def get_current_technician_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Verifica que el usuario tenga rol de TECNICO."""
    if not current_user.role or current_user.role.nombre != RoleEnum.TECNICO:
        raise HTTPException(
            status_code=403, detail="The user does not have enough privileges"
        )
    return current_user

def get_current_admin_or_technician_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Verifica que el usuario tenga rol de ADMIN o TECNICO."""
    if not current_user.role or current_user.role.nombre not in [RoleEnum.ADMIN, RoleEnum.TECNICO]:
        raise HTTPException(
            status_code=403, detail="The user does not have enough privileges"
        )
    return current_user
