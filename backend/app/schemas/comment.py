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
    # SOLUCIÓN: Cambiamos 'usuario_id' a 'autor_id' para que coincida con el modelo de SQLAlchemy
    autor_id: int
    # Podríamos incluir el nombre del usuario para el frontend
    nombre_usuario: Optional[str] = None

    class Config:
        from_attributes = True