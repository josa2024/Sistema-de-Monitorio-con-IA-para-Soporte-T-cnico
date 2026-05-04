from datetime import datetime, timedelta
from typing import Any, Union

import bcrypt
# Parche para evitar el error "(trapped) error reading bcrypt version" con passlib y Python 3.13
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = _About()

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Soportar ambos esquemas: argon2 para nuevas contraseñas, bcrypt para antiguas (retrocompatibilidad)
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False
)


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if not hashed_password:
            print(f"DEBUG verify_password: hash estático (None o vacío)")
            return False
            
        print(f"DEBUG verify_password: Verificando hash={hashed_password[:20]}...")
        
        # 1. Bypassear passlib para hashes de bcrypt y verificar con la librería nativa directamente
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            password_bytes = plain_password.encode('utf-8')[:72]
            return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
            
        # 2. Si es un hash moderno de Argon2, usamos passlib normalmente
        result = pwd_context.verify(plain_password, hashed_password)
        print(f"DEBUG verify_password: Resultado={result}")
        return result
    except Exception as e:
        print(f"DEBUG verify_password: Error al verificar - {type(e).__name__}: {str(e)}")
        return False


def get_password_hash(password: str) -> str:
    # Argon2 (esquema predeterminado ahora) no tiene la limitación de 72 bytes.
    return pwd_context.hash(password)