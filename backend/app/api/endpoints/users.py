from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, require_admin, require_admin_or_ventas
from app.models.user_models import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import user_service 
from app.models.roles import RoleEnum

router = APIRouter()

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(require_admin_or_ventas)])
def get_all_users(db: Session = Depends(get_db)):
    return user_service.get_all_users(db)

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_user(
    user_in: UserCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """Crea un nuevo usuario (Solo ADMIN)."""
    # Verificamos si el email ya existe
    if user_service.get_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    # El servicio create_user se encarga de validar el string del rol
    return user_service.create_user(db, user_in)

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role.nombre != RoleEnum.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No tienes privilegios")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    user_to_update = user_service.get_user_by_id(db, user_id)
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = current_user.role.nombre == RoleEnum.ADMIN
    if not is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No permissions")

    return user_service.update_user(db, user_id, user_in)

@router.patch("/{user_id}/disable", response_model=UserResponse, dependencies=[Depends(require_admin)])
def disable_user(user_id: int, db: Session = Depends(get_db)):
    user = user_service.disable_user(db, user_id)
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return user