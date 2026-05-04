from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.api.deps import get_db
from app.repositories.user_repo import user_repo
from app.schemas.auth import Token, UserCreate
# Aseguramos la importación de User y Role aquí
from app.models.user_models import Role, User 

router = APIRouter()

@router.post("/login/access-token")
def login_for_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Autentica a un usuario y devuelve un token de acceso, su rol y su nombre.
    """
    user = user_repo.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    # Obtenemos el nombre del rol para enviarlo al frontend
    user_role = user.role.nombre if user.role else "CLIENTE"

    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user_role,
        "nombre": user.nombre
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario con el rol de CLIENTE.
    """
    user = user_repo.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado en el sistema."
        )
    
    role = user_repo.get_role_by_name(db, nombre="CLIENTE")
    if not role:
        role = Role(nombre="CLIENTE")
        db.add(role)
        db.commit()
        db.refresh(role)

    new_user = user_repo.create_user(db, user_in, role_id=role.id)
    
    return {"message": "¡Cuenta creada exitosamente!", "email": new_user.email}

# --- NUEVO ENDPOINT PARA EL BUSCADOR DEL INVENTARIO ---
@router.get("/clientes")
def get_clientes(db: Session = Depends(get_db)):
    """
    Obtiene la lista de clientes registrados en el sistema para el modal de despachos.
    """
    clientes = db.query(User).join(Role).filter(Role.nombre == "CLIENTE").all()
    return [{"id": c.id, "nombre": c.nombre, "email": c.email} for c in clientes]