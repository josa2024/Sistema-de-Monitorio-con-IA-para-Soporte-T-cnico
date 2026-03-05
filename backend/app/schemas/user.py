from typing import Optional
from pydantic import BaseModel, EmailStr

# --- Esquema Base ---
class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    nombre: Optional[str] = None

# --- Esquema para Crear/Registrar (Input) ---
# Este es el que te faltaba y causaba el error
class ClientRegister(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    # Puedes agregar más campos si la HU-01 lo requiere (ej. teléfono)

class UserCreate(UserBase):
    password: str
    role_id: Optional[int] = None

# --- Esquema para Actualizar (Input) ---
class UserUpdate(UserBase):
    password: Optional[str] = None
    role_id: Optional[int] = None

# --- Esquema para Respuesta (Output) ---
class RoleBase(BaseModel):
    id: int
    nombre: str
    
    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    role_id: int
    role: Optional[RoleBase] = None

    class Config:
        # Permite a Pydantic leer datos desde los modelos ORM de SQLAlchemy
        from_attributes = True
