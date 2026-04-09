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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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


class RoleChecker:
    """
    Clase de dependencia que verifica si el usuario actual tiene uno de los roles permitidos.
    """
    def __init__(self, allowed_roles: List[RoleEnum]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)):
        # Verificación segura por si el usuario no tiene la relación 'role' cargada
        if not getattr(user, 'role', None) or user.role.nombre not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operación denegada. Se requiere uno de los siguientes roles: {[r.value for r in self.allowed_roles]}"
            )
        return user


# ==========================================
# DEPENDENCIAS DE ROLES (BASADO EN REGLAS DE NEGOCIO)
# ==========================================

# 1. Acceso Global Absoluto
require_admin = RoleChecker([RoleEnum.ADMIN])

# 2. Acceso para Creación Comercial (Alta de Clientes y Venta de Equipos)
require_admin_or_ventas = RoleChecker([RoleEnum.ADMIN, RoleEnum.VENTAS])

# 3. Acceso de Soporte y Diagnóstico (Actualización de Tickets y Gestión de Licencias)
require_admin_or_tecnico = RoleChecker([RoleEnum.ADMIN, RoleEnum.TECNICO])

# 4. Acceso de Visualización Interna (Leer Inventario y Ver Cola de Tickets)
require_internal_staff = RoleChecker([RoleEnum.ADMIN, RoleEnum.TECNICO, RoleEnum.VENTAS])

# 5. Acceso exclusivo para Clientes
require_cliente = RoleChecker([RoleEnum.CLIENTE])


# ==========================================
# FUNCIONES LEGACY (Mantenidas por compatibilidad temporal)
# ==========================================
def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    if not getattr(current_user, 'role', None) or current_user.role.nombre != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="The user does not have enough privileges")
    return current_user

def get_current_technician_user(current_user: User = Depends(get_current_active_user)) -> User:
    if not getattr(current_user, 'role', None) or current_user.role.nombre != RoleEnum.TECNICO:
        raise HTTPException(status_code=403, detail="The user does not have enough privileges")
    return current_user

def get_current_admin_or_technician_user(current_user: User = Depends(get_current_active_user)) -> User:
    if not getattr(current_user, 'role', None) or current_user.role.nombre not in [RoleEnum.ADMIN, RoleEnum.TECNICO]:
        raise HTTPException(status_code=403, detail="The user does not have enough privileges")
    return current_user