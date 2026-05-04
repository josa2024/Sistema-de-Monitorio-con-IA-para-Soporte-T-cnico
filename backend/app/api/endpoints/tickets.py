import json
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date
from pydantic import BaseModel
import random

# Importamos las dependencias de roles
from app.api import deps
from app.models.roles import RoleEnum
from app.models.ticket import Ticket, TicketLog, ComentarioTicket, TicketStatus, TicketPriority
from app.models.user_models import User
from app.models.equipment_models import Equipo, StatusEquipo, GarantiaLicencia, TipoGarantia # 🔥 IMPORTAMOS GarantiaLicencia
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketLogResponse, TicketAssign
from app.services.ticket_service import TicketService

router = APIRouter()

# --- Esquema para el Cliente Casual ---
class TicketCasualCreate(BaseModel):
    nombre: str
    contacto: str
    equipo: str
    problema: str
    prioridad: TicketPriority = TicketPriority.MEDIA
    categoria: str = "General"

@router.post("/casual", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_casual_ticket(
    *, db: Session = Depends(deps.get_db), ticket_in: TicketCasualCreate
) -> Any:
    try:
        fallback_user = db.query(User).filter(User.role_id.in_([1, 2])).first()
        if not fallback_user:
            fallback_user = db.query(User).first()
            
        if not fallback_user:
            raise Exception("No se encontró ningún usuario en el sistema para asignar el ticket.")

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

        from app.core.websockets import manager
        await manager.broadcast({
            "evento": "NUEVO_TICKET",
            "ticket_id": new_ticket.id,
            "equipo_id": new_ticket.equipo_id,
            "prioridad": new_ticket.prioridad,
            "status": new_ticket.status,
        })
        
        return new_ticket
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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
    if current_user.role.nombre not in [RoleEnum.ADMIN, RoleEnum.VENTAS, RoleEnum.TECNICO]:
        query = query.filter(Ticket.cliente_id == current_user.id)
    if estado:
        query = query.filter(Ticket.status == estado)
    return query.offset(skip).limit(limit).all()

@router.get("/{ticket_id}", response_model=TicketResponse)
def read_ticket(*, db: Session = Depends(deps.get_db), ticket_id: int, current_user: User = Depends(deps.get_current_active_user)) -> Any:
    ticket = db.query(Ticket).options(joinedload(Ticket.cliente), joinedload(Ticket.tecnico)).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="El ticket no existe")
    if current_user.role.nombre == RoleEnum.CLIENTE and ticket.cliente_id != current_user.id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este ticket.")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse, dependencies=[Depends(deps.require_admin_or_tecnico)])
def update_ticket(
    *, db: Session = Depends(deps.get_db), ticket_id: int, ticket_in: TicketUpdate, current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")

    update_data = ticket_in.dict(exclude_unset=True)
    normalized_update = {}
    for field, value in update_data.items():
        real_field = "status" if field == "estado" else field
        normalized_update[real_field] = value

    old_values = {k: (v.value if hasattr(v, 'value') else v) for k, v in {field: getattr(ticket, field) for field in normalized_update.keys()}.items()}

    def to_serializable(value):
        if isinstance(value, datetime): return value.isoformat()
        return value

    old_values_safe = {k: to_serializable(v) for k, v in old_values.items()}
    update_data_safe = {k: to_serializable(v) for k, v in normalized_update.items()}

    for field, value in normalized_update.items():
        setattr(ticket, field, value)

    log_db = TicketLog(ticket_id=ticket.id, usuario_id=current_user.id, accion="ACTUALIZACION", detalles={"antes": old_values_safe, "despues": update_data_safe})
    db.add(log_db)
    
    db.commit()
    db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    *, db: Session = Depends(deps.get_db), ticket_id: int, comment_in: CommentCreate, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    if current_user.role.nombre == RoleEnum.VENTAS: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El rol de Ventas no puede comentar tickets.")
    return ticket_service.add_comment(db=db, ticket_id=ticket_id, comment_in=comment_in, current_user=current_user)

@router.get("/{ticket_id}/comments", response_model=List[CommentResponse])
def read_comments(
    *, db: Session = Depends(deps.get_db), ticket_id: int, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return ticket_service.list_comments(db=db, ticket_id=ticket_id, current_user=current_user)

@router.patch("/{ticket_id}/assign", response_model=TicketResponse, dependencies=[Depends(deps.require_admin_or_tecnico)])
async def assign_ticket(
    *, db: Session = Depends(deps.get_db), ticket_id: int, assign_data: TicketAssign, current_user: User = Depends(deps.get_current_active_user), ticket_service: TicketService = Depends(TicketService)
) -> Any:
    return await ticket_service.assign_ticket(db=db, ticket_id=ticket_id, assign_data=assign_data, current_user=current_user)

@router.post("/{ticket_id}/escalate", response_model=TicketResponse, dependencies=[Depends(deps.require_admin_or_tecnico)])
async def escalate_ticket_to_warranty(
    *, db: Session = Depends(deps.get_db), ticket_id: int, current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=404, detail="Ticket no encontrado")

    equipo = db.query(Equipo).filter(Equipo.id == ticket.equipo_id).first()
    if not equipo: raise HTTPException(status_code=404, detail="Equipo asociado no encontrado.")

    equipo.status = StatusEquipo.FALLA_REPORTADA

    # 🔥 AUTO-GENERAR EXPEDIENTE DE GARANTÍA SI NO EXISTE
    garantia = db.query(GarantiaLicencia).filter(GarantiaLicencia.equipo_id == equipo.id).first()
    if not garantia:
        random_suffix = str(random.randint(1000, 9999))
        garantia = GarantiaLicencia(
            equipo_id=equipo.id,
            tipo=TipoGarantia.HARDWARE,
            nombre_software="Expediente de Revisión Técnica",
            folio=f"REV-{datetime.now().strftime('%Y%m')}-{random_suffix}",
            fecha_inicio=date.today(),
            fecha_vencimiento=date.today(),
            is_active=True,
            ejecutivo_cargo=current_user.nombre or current_user.email
        )
        db.add(garantia)

    old_status = ticket.status
    ticket.status = TicketStatus.RESUELTO

    comentario = ComentarioTicket(
        ticket_id=ticket.id, autor_id=current_user.id,
        contenido="🚨 DIAGNÓSTICO CONCLUIDO: Se determinó que el problema es una falla de hardware. El caso ha sido cerrado en Soporte Técnico y escalado automáticamente al departamento de Logística y Garantías para su revisión física."
    )
    db.add(comentario)

    log_db = TicketLog(
        ticket_id=ticket.id, usuario_id=current_user.id, accion="ESCALADO_GARANTIA",
        detalles={"antes": {"status": old_status.value if hasattr(old_status, 'value') else old_status}, "despues": {"status": "RESUELTO", "equipo_status": "FALLA_REPORTADA"}}
    )
    db.add(log_db)

    db.commit()
    db.refresh(ticket)

    from app.core.websockets import manager
    await manager.broadcast({"evento": "EQUIPO_RECEPCIONADO", "ticket_id": ticket.id, "equipo_id": equipo.id, "status": "FALLA_REPORTADA"})

    return ticket


# ==================================================
# 🔥 NUEVA RUTA: ESCALAR TICKET A MANTENIMIENTO
# ==================================================
@router.post("/{ticket_id}/maintenance", response_model=TicketResponse, dependencies=[Depends(deps.require_admin_or_tecnico)])
async def escalate_ticket_to_maintenance(
    *, db: Session = Depends(deps.get_db), ticket_id: int, current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket: raise HTTPException(status_code=404, detail="Ticket no encontrado")

    equipo = db.query(Equipo).filter(Equipo.id == ticket.equipo_id).first()
    if not equipo: raise HTTPException(status_code=404, detail="Equipo asociado no encontrado.")

    # El equipo también pasa a estado MANTENIMIENTO
    equipo.status = StatusEquipo.MANTENIMIENTO

    old_status = ticket.status
    # Cambiamos el estado del ticket al nuevo estado MANTENIMIENTO
    ticket.status = TicketStatus.MANTENIMIENTO

    comentario = ComentarioTicket(
        ticket_id=ticket.id, autor_id=current_user.id,
        contenido="🔧 MANTENIMIENTO REQUERIDO: El equipo requiere ajustes, limpieza o revisión física preventiva. El ticket ha sido transferido al departamento de Mantenimiento."
    )
    db.add(comentario)

    log_db = TicketLog(
        ticket_id=ticket.id, usuario_id=current_user.id, accion="ESCALADO_MANTENIMIENTO",
        detalles={"antes": {"status": old_status.value if hasattr(old_status, 'value') else old_status}, "despues": {"status": "MANTENIMIENTO", "equipo_status": "MANTENIMIENTO"}}
    )
    db.add(log_db)

    db.commit()
    db.refresh(ticket)

    from app.core.websockets import manager
    await manager.broadcast({"evento": "MANTENIMIENTO_ACTUALIZADO", "ticket_id": ticket.id, "equipo_id": equipo.id, "status": "MANTENIMIENTO"})

    return ticket