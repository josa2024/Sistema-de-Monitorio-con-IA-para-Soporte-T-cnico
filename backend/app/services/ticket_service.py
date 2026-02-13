from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from app.repositories.ticket_repo import TicketRepository
from app.repositories.equipment_repo import EquipmentRepository
from app.schemas.ticket import TicketCreate, TicketUpdate, CommentCreate
from app.core.websockets import manager
from app.models.ticket import Ticket, Comment
from app.models.user_models import User

class TicketService:
    def __init__(
        self, 
        ticket_repo: TicketRepository = Depends(TicketRepository),
        equipment_repo: EquipmentRepository = Depends(EquipmentRepository)
    ):
        self.ticket_repo = ticket_repo
        self.equipment_repo = equipment_repo

    async def create_new_ticket(self, db: Session, ticket_in: TicketCreate, current_user: User) -> Ticket:
        # 1. Validar que el equipo existe
        equipo = self.equipment_repo.get_by_id(db, ticket_in.equipo_id)
        if not equipo:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

        # 2. Validar que el equipo pertenece al cliente que reporta
        # Esta es una regla de seguridad crítica para evitar reportes en equipos ajenos.
        if equipo.cliente_id != current_user.id:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="No tienes permiso para reportar fallas en este equipo."
             )

        # 3. Crear la instancia del modelo con valores por defecto
        new_ticket = Ticket(
            equipo_id=ticket_in.equipo_id,
            cliente_id=current_user.id,
            descripcion_cliente=ticket_in.descripcion_cliente,
            status_reporte="ABIERTO",
            prioridad="MEDIA", # Prioridad por defecto hasta que la IA la analice
        )

        created_ticket = self.ticket_repo.create_ticket(db, new_ticket)

        # 4. Notificar a los clientes conectados vía WebSocket
        payload = {
            "evento": "NUEVO_TICKET",
            "ticket_id": created_ticket.id,
            "equipo": created_ticket.equipo_id,
            "fecha": str(created_ticket.fecha_creacion)
        }
        await manager.broadcast(payload)

        return created_ticket

    def get_all_tickets(self, db: Session, skip: int = 0, limit: int = 100) -> list[Ticket]:
        return self.ticket_repo.get_tickets(db, skip, limit)

    def get_user_tickets(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[Ticket]:
        return self.ticket_repo.get_tickets(db, skip, limit, cliente_id=user_id)

    def get_ticket_detail(self, db: Session, ticket_id: int, current_user: User) -> Ticket:
        ticket = self.ticket_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")
        
        # Validar permisos: Admin o Dueño del ticket
        if current_user.role.nombre != "ADMIN" and ticket.cliente_id != current_user.id:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="No tienes permiso para ver este ticket."
             )
        return ticket

    def update_ticket(self, db: Session, ticket_id: int, ticket_update: TicketUpdate, current_user: User) -> Ticket:
        ticket = self.ticket_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")
        
        # Validar permisos: Solo ADMIN (Técnicos) pueden actualizar estatus/prioridad
        if current_user.role.nombre != "ADMIN":
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="No tienes permiso para actualizar tickets."
             )
        
        update_data = ticket_update.model_dump(exclude_unset=True)
        return self.ticket_repo.update(db, db_obj=ticket, obj_in=update_data)

    def add_comment(self, db: Session, ticket_id: int, comment_in: CommentCreate, current_user: User) -> Comment:
        # Reutilizamos la lógica de permisos de get_ticket_detail para asegurar que solo
        # el dueño o un admin puedan comentar.
        self.get_ticket_detail(db, ticket_id, current_user)
        
        new_comment = Comment(
            ticket_id=ticket_id,
            user_id=current_user.id,
            content=comment_in.content
        )
        return self.ticket_repo.create_comment(db, new_comment)

    def list_comments(self, db: Session, ticket_id: int, current_user: User) -> list[Comment]:
        # Validar acceso
        self.get_ticket_detail(db, ticket_id, current_user)
        return self.ticket_repo.get_comments(db, ticket_id)

    async def assign_ticket(self, db: Session, ticket_id: int, current_user: User) -> Ticket:
        ticket = self.ticket_repo.get_by_id(db, ticket_id)
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")
        
        # Validar permisos: Solo ADMIN (Técnicos) pueden asignarse tickets
        if current_user.role.nombre != "ADMIN":
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="No tienes permiso para asignarte tickets."
             )
        
        # Actualizar tecnico_id y cambiar status a EN_PROGRESO
        update_data = {"tecnico_id": current_user.id, "status_reporte": "EN_PROGRESO"}
        updated_ticket = self.ticket_repo.update(db, db_obj=ticket, obj_in=update_data)

        # Notificar vía WebSocket
        payload = {
            "evento": "TICKET_ASIGNADO",
            "ticket_id": updated_ticket.id,
            "tecnico": current_user.nombre,
            "nuevo_status": "EN_PROGRESO"
        }
        await manager.broadcast(payload)

        return updated_ticket