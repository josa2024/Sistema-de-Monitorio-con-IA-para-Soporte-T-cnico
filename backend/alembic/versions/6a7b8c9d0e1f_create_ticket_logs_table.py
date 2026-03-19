"""Create ticket_logs table

Revision ID: 6a7b8c9d0e1f
Revises: 5f9d3e1b2c4a
Create Date: 2023-10-30 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6a7b8c9d0e1f'
down_revision: Union[str, None] = '5f9d3e1b2c4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Creación de la tabla de auditoría para tickets
    op.create_table(
        'ticket_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('accion', sa.String(), nullable=False),
        sa.Column('detalles', sa.JSON(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # Índice para búsquedas rápidas por ID de log
    op.create_index(op.f('ix_ticket_logs_id'), 'ticket_logs', ['id'], unique=False)
    # Se recomienda un índice adicional para ticket_id si el volumen de logs crece mucho
    op.create_index('ix_ticket_logs_ticket_id', 'ticket_logs', ['ticket_id'], unique=False)

def downgrade() -> None:
    op.drop_index('ix_ticket_logs_ticket_id', table_name='ticket_logs')
    op.drop_index(op.f('ix_ticket_logs_id'), table_name='ticket_logs')
    op.drop_table('ticket_logs')