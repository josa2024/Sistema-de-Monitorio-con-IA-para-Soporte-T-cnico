import os
import shutil
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends, UploadFile
from uuid import uuid4

# Repositories
from app.repositories.ticket_repo import TicketRepository
from app.repositories.equipment_repo import EquipmentRepository
from app.repositories.user_repo import UserRepository
from app.repositories import log_repo

# Schemas
from app.schemas.ticket import TicketCreate, TicketAssign, TicketStatusUpdate, CommentCreate

# Models
from app.models.ticket import Ticket, Comment, TicketAttachment
from app.models.user_models import User
from app.models.roles import RoleEnum # Assuming roles are in an enum for easy checking

# Services
from app.services.notification_service import NotificationService

# Core
from app.core.config import settings

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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    async def create_new_ticket(self, db: Session, ticket_in: TicketCreate, current_user: User) -> Ticket:
        # 1. Crear el ticket en la base de datos
        new_ticket = self.ticket_repo.create(db, obj_in=ticket_in)
        
        # 2. Registrar el evento en el historial
        log_repo.create_log(
            db,
            user_id=current_user.id,
            event_type="TICKET_CREATED",
            message=f"Ticket {new_ticket.id} created by {current_user.email}",
            details={"ticket_id": new_ticket.id, "titulo": new_ticket.titulo}
        )
        db.commit()
        db.refresh(new_ticket)
        
        # 3. Notificar vía WebSocket a través del servicio de notificaciones
        await self.notification_service.notify_new_ticket(new_ticket)
        
        return new_ticket

    async def assign_technician(self, db: Session, ticket_id: int, assign_data: TicketAssign, current_user: User) -> Ticket:
        ticket = self.get_ticket_or_404(db, ticket_id)
        
        # 1. Validate technician exists and has the correct role
        technician = self.user_repo.get_by_id(db, assign_data.technician_id)
        if not technician or technician.role.nombre != RoleEnum.TECNICO:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Technician not found or invalid role")

        # 2. Update ticket
        ticket.tecnico_id = technician.id
        # Optionally, change status upon assignment
        if ticket.status == "ABIERTO":
            ticket.status = "EN_PROGRESO"
        
        db.add(ticket)
        
        # 3. Log history event
        log_repo.create_log(
            db,
            user_id=current_user.id,
            event_type="TICKET_ASSIGNMENT",
            message=f"Ticket {ticket_id} assigned to technician {technician.email}",
            details={"ticket_id": ticket_id, "technician_id": technician.id}
        )
        db.commit()
        db.refresh(ticket)
        
        # 4. Notify via WebSocket (Consider moving to notification_service if complex)
        # For now, keeping it simple as per initial scope
        from app.core.websockets import manager
        await manager.broadcast({
            "event": "TICKET_ASSIGNED",
            "ticket_id": ticket_id,
            "technician_name": technician.nombre
        })
        return ticket

    async def update_status(self, db: Session, ticket_id: int, status_update: TicketStatusUpdate, current_user: User) -> Ticket:
        ticket = self.get_ticket_or_404(db, ticket_id)
        
        # Permissions: only assigned tech or admin can change status
        if not (current_user.role.nombre == RoleEnum.ADMIN or ticket.tecnico_id == current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update status")

        old_status = ticket.status
        ticket.status = status_update.new_status
        db.add(ticket)

        # Log history event
        log_repo.create_log(
            db,
            user_id=current_user.id,
            event_type="TICKET_STATUS_CHANGE",
            message=f"Ticket {ticket_id} status changed from {old_status} to {ticket.status}",
            details={"ticket_id": ticket_id, "old_status": old_status, "new_status": ticket.status}
        )
        db.commit()
        db.refresh(ticket)
        
        # Notify (Consider moving to notification_service)
        from app.core.websockets import manager
        await manager.broadcast({
            "event": "STATUS_UPDATED",
            "ticket_id": ticket_id,
            "new_status": ticket.status
        })
        return ticket

    def add_attachment(self, db: Session, ticket_id: int, file: UploadFile, current_user: User) -> TicketAttachment:
        ticket = self.get_ticket_or_404(db, ticket_id)

        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(settings.UPLOADS_DIR, "tickets", str(ticket_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        # Sanitize filename and ensure uniqueness
        sanitized_filename = os.path.basename(file.filename)
        unique_filename = f"{uuid4().hex}-{sanitized_filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        finally:
            file.file.close()
            
        # Create DB record
        attachment = TicketAttachment(
            ticket_id=ticket_id,
            file_path=file_path,
            original_filename=file.filename,
            content_type=file.content_type,
            uploaded_by_id=current_user.id
        )
        db.add(attachment)
        log_repo.create_log(db, user_id=current_user.id, event_type="TICKET_ATTACHMENT", message=f"File {file.filename} added to ticket {ticket_id}")
        db.commit()
        db.refresh(attachment)
        
        return attachment