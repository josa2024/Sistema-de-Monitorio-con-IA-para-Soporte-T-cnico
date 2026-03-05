from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user_models import User
# Asumimos que existen estos esquemas. Si no, el siguiente error nos lo indicará
# y procederemos a crearlos.
from app.schemas.user import UserCreate, UserResponse, UserUpdate 

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la información del usuario actualmente autenticado.
    """
    return current_user

@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar todos los usuarios.
    Restringido a administradores (validación de rol pendiente de implementación estricta).
    """
    # Ejemplo de validación simple
    if current_user.role.nombre != "ADMIN":
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes")
        
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
def read_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener un usuario específico por ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Validar que solo el admin o el mismo usuario puedan ver sus datos
    if current_user.role.nombre != "ADMIN" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver este usuario")
        
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar datos de un usuario.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current_user.role.nombre != "ADMIN" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="No puedes editar este usuario")

    # Aquí iría la lógica de actualización (mapeo de campos)
    # Por brevedad, retornamos el usuario sin cambios en este stub
    return user