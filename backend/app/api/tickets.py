from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user_models import User
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate, CommentCreate, CommentResponse
from app.services.ticket_service import TicketService

router = APIRouter()

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """
    Reportar una nueva falla o incidencia.
    El usuario autenticado debe ser el propietario del equipo.
    """
    return await service.create_new_ticket(db, ticket_in, current_user)

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """
    Listar tickets.
    - Si es ADMIN/TECNICO: Ve todos los tickets (opcionalmente filtrados por status).
    - Si es CLIENTE: Ve solo sus propios tickets.
    """
    # Asumimos que el rol se verifica por el nombre. Ajusta según tu modelo de Roles.
    if current_user.role.nombre in ["ADMIN", "TECNICO", "SOPORTE"]:
        return service.get_all_tickets(db, skip=skip, limit=limit) # Se puede pasar status si el servicio lo soporta
    
    # Lógica para clientes
    return service.get_user_tickets(db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el detalle de un ticket específico.
    Solo accesible para el dueño del ticket o administradores.
    """
    return service.get_ticket_detail(db, ticket_id, current_user)

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza el estatus o prioridad de un ticket.
    Solo accesible para técnicos (ADMIN).
    """
    # Validación de permisos básica
    if current_user.role.nombre not in ["ADMIN", "TECNICO", "SOPORTE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para actualizar tickets."
        )
    return service.update_ticket(db, ticket_id, ticket_update, current_user)

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """
    Permite a un técnico (ADMIN) asignarse un ticket para comenzar a trabajarlo.
    """
    return await service.assign_ticket(db, ticket_id, current_user)

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """Agrega un comentario a un ticket existente."""
    return service.add_comment(db, ticket_id, comment_in, current_user)

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
def read_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    service: TicketService = Depends(TicketService),
    current_user: User = Depends(get_current_user)
):
    """Lista los comentarios de un ticket."""
    return service.list_comments(db, ticket_id, current_user)