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
    print(f"DEBUG: Login attempt for email: {form_data.username}")
    try:
        user = user_service.authenticate(
            db, email=form_data.username, password=form_data.password
        )
        print(f"DEBUG: Authentication result: {user}")
        if not user:
            print("DEBUG: No user found or password incorrect")
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        elif not user.is_active:
            print("DEBUG: User inactive")
            raise HTTPException(status_code=400, detail="Inactive user")
        
        print(f"DEBUG: User authenticated: {user.email}, role: {user.role.nombre if user.role else 'None'}")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token_data = {
            "access_token": security.create_access_token(
                user.email, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
            "nombre": user.nombre, # <-- Añadimos el nombre para que el frontend lo muestre
            "role": user.role.nombre if user.role else "CLIENTE" # <-- Añadimos el rol exacto de la base de datos
        }
        print(f"DEBUG: Token created successfully")
        return token_data
    except Exception as e:
        print(f"DEBUG: Exception in login: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

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