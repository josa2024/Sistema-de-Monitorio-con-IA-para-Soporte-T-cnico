"""agregar tabla tickets, comentarios y logs

Revision ID: b217285236f5
Revises: ffa414015326
Create Date: 2026-02-13 13:55:00.559294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b217285236f5'
down_revision: Union[str, Sequence[str], None] = 'ffa414015326'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Crear los tipos ENUM en PostgreSQL
    ticket_status = postgresql.ENUM('ABIERTO', 'EN_PROGRESO', 'CERRADO', name='ticketstatus')
    ticket_status.create(op.get_bind(), checkfirst=True)
    
    ticket_priority = postgresql.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA', name='ticketpriority')
    ticket_priority.create(op.get_bind(), checkfirst=True)

    # 2. Crear tabla tickets
    op.create_table('tickets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=False),
        sa.Column('estado', postgresql.ENUM('ABIERTO', 'EN_PROGRESO', 'CERRADO', name='ticketstatus', create_type=False), nullable=True),
        sa.Column('prioridad', postgresql.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA', name='ticketpriority', create_type=False), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('equipo_id', sa.Integer(), nullable=False),
        sa.Column('tecnico_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['cliente_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['equipo_id'], ['equipos.id'], ),
        sa.ForeignKeyConstraint(['tecnico_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tickets_id'), 'tickets', ['id'], unique=False)

    # 3. Crear tabla ticket_comments
    op.create_table('ticket_comments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('contenido', sa.Text(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ticket_comments_id'), 'ticket_comments', ['id'], unique=False)

    # 4. Crear tabla ticket_logs
    op.create_table('ticket_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('accion', sa.String(), nullable=False),
        sa.Column('detalles', sa.JSON(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ticket_logs_id'), 'ticket_logs', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Eliminar tablas en orden inverso a su creación
    op.drop_index(op.f('ix_ticket_logs_id'), table_name='ticket_logs')
    op.drop_table('ticket_logs')
    
    op.drop_index(op.f('ix_ticket_comments_id'), table_name='ticket_comments')
    op.drop_table('ticket_comments')
    
    op.drop_index(op.f('ix_tickets_id'), table_name='tickets')
    op.drop_table('tickets')

    # Eliminar ENUMs
    ticket_status = postgresql.ENUM('ABIERTO', 'EN_PROGRESO', 'CERRADO', name='ticketstatus')
    ticket_status.drop(op.get_bind(), checkfirst=True)
    
    ticket_priority = postgresql.ENUM('BAJA', 'MEDIA', 'ALTA', 'CRITICA', name='ticketpriority')
    ticket_priority.drop(op.get_bind(), checkfirst=True)
