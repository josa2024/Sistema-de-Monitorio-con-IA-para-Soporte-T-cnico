from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.ticket import Ticket, Comment

class TicketRepository:
    def create_ticket(self, db: Session, ticket: Ticket) -> Ticket:
        """Inserta un nuevo ticket en la base de datos."""
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    def get_tickets(self, db: Session, skip: int = 0, limit: int = 100, 
                   equipo_id: Optional[int] = None, cliente_id: Optional[int] = None) -> List[Ticket]:
        """Lista tickets con filtros opcionales."""
        query = db.query(Ticket)
        if equipo_id:
            query = query.filter(Ticket.equipo_id == equipo_id)
        if cliente_id:
            query = query.filter(Ticket.cliente_id == cliente_id)
        return query.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, ticket_id: int) -> Optional[Ticket]:
        """Busca un ticket por su ID."""
        return db.query(Ticket).filter(Ticket.id == ticket_id).first()

    def update(self, db: Session, *, db_obj: Ticket, obj_in: dict) -> Ticket:
        """Actualiza los campos de un ticket existente."""
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_comment(self, db: Session, comment: Comment) -> Comment:
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment

    def get_comments(self, db: Session, ticket_id: int) -> List[Comment]:
        return db.query(Comment).filter(Comment.ticket_id == ticket_id).order_by(Comment.created_at.asc()).all()