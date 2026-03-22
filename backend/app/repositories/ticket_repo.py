from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.ticket import Ticket, ComentarioTicket

class TicketRepository:
    def create_ticket(self, db: Session, ticket: Ticket) -> Ticket:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    def get_tickets(self, db: Session, skip: int = 0, limit: int = 100, 
                    equipo_id: Optional[int] = None, cliente_id: Optional[int] = None) -> List[Ticket]:
        query = db.query(Ticket)
        if equipo_id:
            query = query.filter(Ticket.equipo_id == equipo_id)
        if cliente_id:
            query = query.filter(Ticket.cliente_id == cliente_id)
        return query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, ticket_id: int) -> Optional[Ticket]:
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()

    def update(self, db: Session, *, db_obj: Ticket, obj_in: dict) -> Ticket:
        # CORRECCIÓN DEFINITIVA: Actualizamos los campos sin generar diccionarios complejos para el log
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_comment(self, db: Session, comment: ComentarioTicket) -> ComentarioTicket:
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment

    def get_comments(self, db: Session, ticket_id: int) -> List[ComentarioTicket]:
        return db.query(ComentarioTicket).filter(ComentarioTicket.ticket_id == ticket_id).order_by(ComentarioTicket.fecha_creacion.asc()).all()