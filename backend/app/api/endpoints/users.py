from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Importamos las llaves de seguridad
from app.api.deps import get_db, get_current_active_user, require_admin, require_admin_or_ventas
from app.models.user_models import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import user_service 
from app.models.roles import RoleEnum

router = APIRouter()

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(require_admin_or_ventas)])
def get_all_users(db: Session = Depends(get_db)):
    """
    Obtiene una lista de todos los usuarios.
    Accesible para usuarios con rol ADMIN y VENTAS.
    """
    return user_service.get_all_users(db)

# CAMBIO AQUÍ: Ahora es exclusivo de ADMIN (Ventas ya no puede crear usuarios)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_user(
    user_in: UserCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    """
    Crea un nuevo usuario.
    ADMIN puede crear cuentas de VENTAS, TECNICO o CLIENTE libremente.
    """
    if user_in.role_id:
        role = user_service.get_role_by_id(db, user_in.role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with id {user_in.role_id} not found"
            )
            
    existing_user = user_service.get_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
        
    return user_service.create_user(db, user_in)

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene los detalles de un usuario.
    """
    if current_user.role.nombre != RoleEnum.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes privilegios suficientes")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with id {user_id} not found")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_admin = current_user.role.nombre == RoleEnum.ADMIN
    is_self = current_user.id == user_id

    if not is_admin and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No permissions to update this user.")

    if not is_admin and user_in.role_id is not None and user_in.role_id != user_to_update.role_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change user roles.")
        
    if user_in.email and user_in.email != user_to_update.email:
        existing_user = user_service.get_by_email(db, user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    return user_service.update_user(db, user_id, user_in)

@router.patch("/{user_id}/disable", response_model=UserResponse, dependencies=[Depends(require_admin)])
def disable_user(user_id: int, db: Session = Depends(get_db)):
    user = user_service.disable_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user