import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from pydantic import BaseModel

from app.api import deps
from app.models.ticket import Ticket, TicketLog, ComentarioTicket, TicketStatus, TicketPriority
from app.models.user_models import User
from app.models.equipment_models import Equipo
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketLogResponse, TicketAssign
from app.services.ticket_service import TicketService

router = APIRouter()

# --- NUEVO: Esquema para el Cliente Casual ---
class TicketCasualCreate(BaseModel):
    nombre: str
    contacto: str
    equipo: str
    problema: str
    prioridad: TicketPriority = TicketPriority.MEDIA
    categoria: str = "General"

@router.post("/casual", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_casual_ticket(
    *, db: Session = Depends(deps.get_db), ticket_in: TicketCasualCreate
) -> Any:
    try:
        # 1. Buscar un administrador para asignarle el ticket huérfano y evitar errores de BD
        fallback_user = db.query(User).filter(User.role_id.in_([1, 2])).first()
        if not fallback_user:
            fallback_user = db.query(User).first()
            
        if not fallback_user:
            raise Exception("No se encontró ningún usuario en el sistema para asignar el ticket.")

        # 2. Buscar o crear un Equipo Genérico de soporte externo
        casual_eq = db.query(Equipo).filter(Equipo.numero_serie == "CASUAL-000").first()
        if not casual_eq:
            casual_eq = Equipo(
                modelo="Equipo Externo / No Registrado", 
                numero_serie="CASUAL-000", 
                status="INSTALADO", 
                cliente_id=fallback_user.id
            )
            db.add(casual_eq)
            db.commit()
            db.refresh(casual_eq)

        # 3. Guardar los datos de contacto reales del cliente en la descripción
        descripcion_completa = (
            f"**DATOS DEL CLIENTE INVITADO:**\n"
            f"- Nombre: {ticket_in.nombre}\n"
            f"- Contacto: {ticket_in.contacto}\n"
            f"- Modelo Reportado: {ticket_in.equipo}\n\n"
            f"**REPORTE DE LA IA:**\n{ticket_in.problema}"
        )

        new_ticket = Ticket(
            titulo=f"Soporte Externo: {ticket_in.nombre}",
            descripcion=descripcion_completa,
            status=TicketStatus.ABIERTO,
            prioridad=ticket_in.prioridad,
            categoria=ticket_in.categoria,
            cliente_id=fallback_user.id,
            equipo_id=casual_eq.id
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        
        return new_ticket
    
    except Exception as e:
        db.rollback()
        # Esto atrapa el error y lo devuelve limpio, evitando el falso bloqueo de CORS
        raise HTTPException(status_code=500, detail=str(e))

# --- RUTAS EXISTENTES ---

@router.post("/anomalias", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_anomaly_ticket(
    *, db: Session = Depends(deps.get_db), ticket_in: TicketCreate, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    *, db: Session = Depends(deps.get_db), ticket_in: TicketCreate, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.create_new_ticket(db=db, ticket_in=ticket_in, current_user=current_user)

@router.get("/", response_model=List[TicketResponse])
def read_tickets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    estado: Optional[TicketStatus] = None,
    current_user: User = Depends(deps.get_current_active_user) 
) -> Any:
    query = db.query(Ticket).options(joinedload(Ticket.cliente), joinedload(Ticket.tecnico))
    
    if current_user.role_id not in [1, 2] and not (current_user.role and current_user.role.nombre in ["ADMIN", "VENTAS"]):
        query = query.filter(Ticket.cliente_id == current_user.id)
        
    if estado:
        query = query.filter(Ticket.status == estado)
        
    return query.offset(skip).limit(limit).all()

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(*, db: Session = Depends(deps.get_db), ticket_id: int) -> Any:
    ticket = db.query(Ticket).options(joinedload(Ticket.cliente), joinedload(Ticket.tecnico)).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="El ticket no existe")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    *, db: Session = Depends(deps.get_db), ticket_id: int, ticket_in: TicketUpdate, current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket_in.estado is not None: ticket.status = ticket_in.estado
    if ticket_in.prioridad is not None: ticket.prioridad = ticket_in.prioridad
    if ticket_in.fecha_agendada is not None: ticket.fecha_agendada = ticket_in.fecha_agendada

    log_db = TicketLog(ticket_id=ticket.id, usuario_id=current_user.id, accion="ACTUALIZACION", detalles={"mensaje": "El ticket ha sido modificado exitosamente."})
    db.add(log_db)
    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    *, db: Session = Depends(deps.get_db), ticket_id: int, comment_in: CommentCreate, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return ticket_service.add_comment(db=db, ticket_id=ticket_id, comment_in=comment_in, current_user=current_user)

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
def read_comments(
    *, db: Session = Depends(deps.get_db), ticket_id: int, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return ticket_service.list_comments(db=db, ticket_id=ticket_id, current_user=current_user)

@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    *, db: Session = Depends(deps.get_db), ticket_id: int, assign_data: TicketAssign, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.assign_ticket(db=db, ticket_id=ticket_id, assign_data=assign_data, current_user=current_user)