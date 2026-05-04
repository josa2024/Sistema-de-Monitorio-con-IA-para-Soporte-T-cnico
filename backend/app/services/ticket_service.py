import os
import shutil
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends, UploadFile
from uuid import uuid4

# Repositories
from app.repositories.ticket_repo import TicketRepository
from app.repositories.equipment_repo import EquipmentRepository
from app.repositories.user_repo import UserRepository

# Schemas
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketAssign, TicketStatusUpdate, CommentCreate

# Models
from app.models.ticket import Ticket, ComentarioTicket, TicketAttachment, TicketLog
from app.models.user_models import User

# Services
from app.services.notification_service import NotificationService

# Core
from app.core.config import settings
from app.core.websockets import manager

class TicketService:
    def __init__(
        self, 
        ticket_repo: TicketRepository = Depends(TicketRepository),
        equipment_repo: EquipmentRepository = Depends(EquipmentRepository),
        user_repo: UserRepository = Depends(UserRepository),
        notification_service: NotificationService = Depends(NotificationService)
    ):
        self.ticket_repo = ticket_repo
        self.equipment_repo = equipment_repo
        self.user_repo = user_repo
        self.notification_service = notification_service

    def get_ticket_or_404(self, db: Session, ticket_id: int) -> Ticket:
        ticket = self.ticket_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")
        return ticket

    async def create_new_ticket(self, db: Session, ticket_in: TicketCreate, current_user: User) -> Ticket:
        equipo = self.equipment_repo.get_by_id(db, ticket_in.equipo_id)
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        new_ticket = Ticket(
            titulo=ticket_in.titulo,
            descripcion=ticket_in.descripcion,
            equipo_id=ticket_in.equipo_id,
            cliente_id=current_user.id,
            status="ABIERTO",
            prioridad="ALTA" if "ALTA" in ticket_in.descripcion.upper() or "CRITICA" in ticket_in.descripcion.upper() else "MEDIA",
            categoria=ticket_in.categoria
        )

        created_ticket = self.ticket_repo.create_ticket(db, new_ticket)

        new_log = TicketLog(
            ticket_id=created_ticket.id,
            usuario_id=current_user.id,
            accion="CREACION",
            detalles={"titulo": created_ticket.titulo}
        )
        db.add(new_log)
        db.commit()

        payload = {
            "evento": "NUEVO_TICKET",
            "ticket_id": created_ticket.id,
            "equipo": created_ticket.equipo_id,
            "fecha": str(created_ticket.created_at) 
        }
        await manager.broadcast(payload)
        
        return created_ticket

    def get_all_tickets(self, db: Session, skip: int = 0, limit: int = 100) -> list[Ticket]:
        return self.ticket_repo.get_tickets(db, skip, limit)

    def get_user_tickets(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Ticket]:
        return self.ticket_repo.get_tickets(db, skip, limit, cliente_id=user_id)

    def get_ticket_detail(self, db: Session, ticket_id: int, current_user: User) -> Ticket:
        return self.get_ticket_or_404(db, ticket_id)

    def update_ticket(self, db: Session, ticket_id: int, ticket_update: TicketUpdate, current_user: User) -> Ticket:
        ticket = self.get_ticket_or_404(db, ticket_id)
        update_data = ticket_update.model_dump(exclude_unset=True)
        return self.ticket_repo.update(db, db_obj=ticket, obj_in=update_data)

    def add_comment(self, db: Session, ticket_id: int, comment_in: CommentCreate, current_user: User) -> ComentarioTicket:
        self.get_ticket_detail(db, ticket_id, current_user)
        new_comment = ComentarioTicket(
            ticket_id=ticket_id,
            autor_id=current_user.id,
            contenido=comment_in.contenido
        )
        return self.ticket_repo.create_comment(db, new_comment)

    def list_comments(self, db: Session, ticket_id: int, current_user: User) -> list[ComentarioTicket]:
        self.get_ticket_detail(db, ticket_id, current_user)
        return self.ticket_repo.get_comments(db, ticket_id)

    async def assign_ticket(self, db: Session, ticket_id: int, assign_data: TicketAssign, current_user: User) -> Ticket:
        ticket = self.get_ticket_or_404(db, ticket_id)

        # CORRECCIÓN: Buscamos al técnico directamente en la base de datos
        technician = db.query(User).filter(User.id == assign_data.tecnico_id).first()
        
        if not technician:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Técnico no encontrado")

        ticket.tecnico_id = technician.id
        if ticket.status == "ABIERTO":
            ticket.status = "EN_PROGRESO"
        
        new_log = TicketLog(
            ticket_id=ticket.id,
            usuario_id=current_user.id,
            accion="ASIGNACION",
            detalles={"tecnico_id": technician.id}
        )
        db.add(new_log)
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        await manager.broadcast({
            "evento": "TICKET_ASIGNADO",
            "ticket_id": ticket_id,
            "tecnico": technician.nombre,
            "nuevo_status": ticket.status
        })
        return ticket

    async def update_status(self, db: Session, ticket_id: int, status_update: TicketStatusUpdate, current_user: User) -> Ticket:
        ticket = self.get_ticket_or_404(db, ticket_id)

        old_status = ticket.status
        ticket.status = status_update.estado
        
        new_log = TicketLog(
            ticket_id=ticket.id,
            usuario_id=current_user.id,
            accion="CAMBIO_ESTADO",
            detalles={"new_status": ticket.status}
        )
        db.add(new_log)
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        await manager.broadcast({
            "evento": "STATUS_UPDATED",
            "ticket_id": ticket_id,
            "new_status": ticket.status
        })
        return ticket

    def add_attachment(self, db: Session, ticket_id: int, file: UploadFile, current_user: User) -> TicketAttachment:
        ticket = self.get_ticket_or_404(db, ticket_id)

        upload_dir = os.path.join(settings.UPLOADS_DIR, "tickets", str(ticket_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        sanitized_filename = os.path.basename(file.filename)
        unique_filename = f"{uuid4().hex}-{sanitized_filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        finally:
            file.file.close()
            
        attachment = TicketAttachment(
            ticket_id=ticket_id,
            file_path=file_path,
            original_filename=file.filename,
            content_type=file.content_type,
            uploaded_by_id=current_user.id
        )
        db.add(attachment)
        
        new_log = TicketLog(
            ticket_id=ticket.id,
            usuario_id=current_user.id,
            accion="NUEVO_ARCHIVO",
            detalles={"archivo": file.filename}
        )
        db.add(new_log)
        
        db.commit()
        db.refresh(attachment)
        
        return attachment