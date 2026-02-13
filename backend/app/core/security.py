from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Configuración de Passlib para el hashing de contraseñas
# Se usará bcrypt como el algoritmo principal
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña en texto plano coincide con su versión hasheada.

    Args:
        plain_password: La contraseña sin hashear.
        hashed_password: La contraseña hasheada almacenada.

    Returns:
        True si las contraseñas coinciden, False en caso contrario.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hashea una contraseña usando el contexto de Passlib.

    Args:
        password: La contraseña a hashear.

    Returns:
        El hash de la contraseña.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token de acceso JWT.

    Args:
        data: Los datos a incluir en el payload del token (ej. 'sub' para el username).
        expires_delta: El tiempo de vida del token. Si no se especifica, se usará el valor de configuración.

    Returns:
        El token JWT codificado como una cadena.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt