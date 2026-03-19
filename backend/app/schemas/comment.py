from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class CommentBase(BaseModel):
    contenido: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    fecha_creacion: datetime
    ticket_id: int
    usuario_id: int
    # Podríamos incluir el nombre del usuario para el frontend
    nombre_usuario: Optional[str] = None

    class Config:
        from_attributes = True