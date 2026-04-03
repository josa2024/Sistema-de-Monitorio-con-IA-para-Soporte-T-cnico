from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user_models import User
from app.models.roles import Role, RoleEnum


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
    print(f"DEBUG get_current_user: Token recibido: {token[:20] if token else 'NONE'}...")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"DEBUG: Intentando decodificar token con SECRET_KEY={settings.SECRET_KEY[:10]}... y ALGORITHM={settings.ALGORITHM}")
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        print(f"DEBUG: Token decodificado, email={email}")
        if email is None:
            print("DEBUG: Email es None en el token")
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: Error al decodificar JWT: {str(e)}")
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"DEBUG: Usuario no encontrado para email={email}")
        raise credentials_exception
    print(f"DEBUG: Usuario encontrado: {user.email}, activo={user.is_active}")
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Verifica que el usuario actual esté activo."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


class RoleChecker:
    """
    Clase de dependencia que verifica si el usuario actual tiene uno de los roles permitidos.
    """
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)):
        if user.role.nombre not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user does not have enough privileges"
            )
        return user

# Dependencias específicas para roles para mayor legibilidad en los endpoints
require_admin = RoleChecker([RoleEnum.ADMIN])
require_tecnico = RoleChecker([RoleEnum.TECNICO])
require_cliente = RoleChecker([RoleEnum.CLIENTE])
require_admin_or_tecnico = RoleChecker([RoleEnum.ADMIN, RoleEnum.TECNICO])



# Funciones de dependencia "legacy" - se pueden ir reemplazando por el RoleChecker
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
