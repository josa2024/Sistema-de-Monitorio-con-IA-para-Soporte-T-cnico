from typing import Optional
from pydantic import BaseModel, EmailStr

# --- Esquema Base ---
class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    nombre: Optional[str] = None

# --- Esquema para Registro Externo (HU-01) ---
class ClientRegister(BaseModel):
    email: EmailStr
    password: str
    nombre: str

# --- Esquema para Creación Administrativa (Input) ---
class UserCreate(UserBase):
    password: str
    # Aceptamos el nombre del rol como string (ej: "TECNICO")
    role_id: Optional[str] = None 

# --- Esquema para Actualización (Input) ---
class UserUpdate(UserBase):
    password: Optional[str] = None
    role_id: Optional[str] = None 

# --- Esquemas para Respuesta (Output) ---
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
        from_attributes = True