"""Create notifications table

Revision ID: 3d9b1b7f8e0a
Revises: 3f8a9b2c1d4e
Create Date: 2023-10-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d9b1b7f8e0a'
down_revision: Union[str, None] = '3f8a9b2c1d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Crear la tabla 'tickets' que falta (dependencia) ---
    # Basado en el modelo actual que se usa en los endpoints.
    op.create_table('tickets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=255), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('prioridad', sa.String(length=50), nullable=True),
        sa.Column('estado', sa.String(length=50), nullable=True),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('equipo_id', sa.Integer(), nullable=False),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['cliente_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['equipo_id'], ['equipos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tickets_id'), 'tickets', ['id'], unique=False)

    # --- 2. Crear la tabla 'notifications' como estaba planeado ---
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mensaje', sa.String(), nullable=False),
        sa.Column('leida', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('ticket_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)


def downgrade() -> None:
    # Se revierte en orden inverso a la creación para respetar las dependencias
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_tickets_id'), table_name='tickets')
    op.drop_table('tickets')