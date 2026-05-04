from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class NotificationBase(BaseModel):
    mensaje: str
    leida: bool = False

class NotificationCreate(NotificationBase):
    ticket_id: Optional[int] = None

class NotificationUpdate(BaseModel):
    leida: bool

class NotificationResponse(NotificationBase):
    id: int
    ticket_id: Optional[int] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True