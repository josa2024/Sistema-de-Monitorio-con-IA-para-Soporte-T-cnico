from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.schemas.user import ClientRegister, UserResponse
from app.services.user_service import UserService

router = APIRouter()
user_service = UserService()

@router.post("/login/access-token")
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = user_service.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        # CORRECCIÓN 2: Guardamos el email en el token para que deps.py lo pueda leer correctamente.
        "access_token": security.create_access_token(
            user.email, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserResponse)
def register_client(
    *,
    db: Session = Depends(deps.get_db),
    client_in: ClientRegister,
) -> Any:
    """
    HU-01: Registro de nuevos clientes.
    Permite a un usuario registrarse manualmente para dar seguimiento a su equipo.
    """
    user = user_service.register_client(db, client_in)
    return user
