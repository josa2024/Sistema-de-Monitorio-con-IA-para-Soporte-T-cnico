import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.ticket import Ticket, TicketLog, ComentarioTicket
from app.models.user_models import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketStatus, TicketLogResponse
from app.services.ticket_service import TicketService

router = APIRouter()

@router.post("/anomalias", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_anomaly_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_in: TicketCreate,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    """
    HU-02: Crea un reporte de anomalía (ticket) y notifica en tiempo real.
    Este endpoint es el solicitado para que un cliente reporte una anomalía.
    """
    new_ticket = await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)
    return new_ticket

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_in: TicketCreate,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    """
    Crea un ticket genérico. Refactorizado para usar el servicio de tickets.
    """
    new_ticket = await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)
    return new_ticket

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[TicketStatus] = None
) -> Any:
    """
    Obtiene la lista de tickets para el dashboard.
    Soporta paginación y filtrado por estado (ej. ver solo los ABIERTOS).
    """
    query = db.query(Ticket)
    if estado:
        query = query.filter(Ticket.estado == estado)
    
    tickets = query.offset(skip).limit(limit).all()
    return tickets

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
) -> Any:
    """
    Obtiene el detalle completo de un ticket específico.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El ticket no existe"
        )
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
    ticket_in: TicketUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Actualiza parcialmente un ticket (ej. cambiar estado a EN_PROGRESO).
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")

    update_data = ticket_in.dict(exclude_unset=True)
    
    old_values = {k: (v.value if hasattr(v, 'value') else v) for k, v in {field: getattr(ticket, field) for field in update_data.keys()}.items()}

    for field, value in update_data.items():
        setattr(ticket, field, value)

    # Log action
    log_db = TicketLog(ticket_id=ticket.id, usuario_id=current_user.id, accion="ACTUALIZACION", detalles={"antes": old_values, "despues": update_data})
    db.add(log_db)
    
    db.commit()
    db.refresh(ticket)
    return ticket

# ... (el resto de los endpoints como 'take_ticket', 'add_comment', etc. se mantienen igual)