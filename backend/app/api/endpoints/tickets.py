import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import deps
from app.models.ticket import Ticket, TicketLog, ComentarioTicket
from app.models.user_models import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketStatus, TicketLogResponse, TicketAssign
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
    return await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_in: TicketCreate,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[TicketStatus] = None
) -> Any:
    query = db.query(Ticket)
    if estado:
        query = query.filter(Ticket.estado == estado)
    return query.offset(skip).limit(limit).all()

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="El ticket no existe")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
    ticket_in: TicketUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! 
    # Mapeamos explícitamente los datos para que coincidan con SQLAlchemy
    if ticket_in.estado is not None:
        ticket.status = ticket_in.estado  # <- 'estado' del frontend pasa a ser 'status' de la BD
    if ticket_in.prioridad is not None:
        ticket.prioridad = ticket_in.prioridad
    if ticket_in.fecha_agendada is not None:
        ticket.fecha_agendada = ticket_in.fecha_agendada

    log_db = TicketLog(
        ticket_id=ticket.id, 
        usuario_id=current_user.id, 
        accion="ACTUALIZACION", 
        detalles={"mensaje": "El ticket ha sido modificado exitosamente."}
    )
    db.add(log_db)
    
    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return ticket_service.add_comment(db=db, ticket_id=ticket_id, comment_in=comment_in, current_user=current_user)

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
def read_comments(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return ticket_service.list_comments(db=db, ticket_id=ticket_id, current_user=current_user)

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    *,
    db: Session = Depends(deps.get_db),
    ticket_id: int,
    assign_data: TicketAssign,
    current_user: User = Depends(deps.get_current_active_user),
    ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.assign_ticket(db=db, ticket_id=ticket_id, assign_data=assign_data, current_user=current_user)