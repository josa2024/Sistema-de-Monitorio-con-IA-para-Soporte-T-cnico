from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    nombre: str
    apellidos: str
    direccion: str
    telefono: str
    email: EmailStr
    password: str