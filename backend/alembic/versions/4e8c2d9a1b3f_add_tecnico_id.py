"""Add tecnico_id to tickets

Revision ID: 4e8c2d9a1b3f
Revises: 3d9b1b7f8e0a
Create Date: 2023-10-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e8c2d9a1b3f'
down_revision: Union[str, None] = '3d9b1b7f8e0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agregamos la columna tecnico_id permitiendo nulos (nullable=True)
    op.add_column('tickets', sa.Column('tecnico_id', sa.Integer(), nullable=True))
    
    # Creamos la llave foránea hacia la tabla users
    # Nombre del constraint: fk_tickets_tecnico_id
    op.create_foreign_key('fk_tickets_tecnico_id', 'tickets', 'users', ['tecnico_id'], ['id'])


def downgrade() -> None:
    # Eliminamos el constraint y la columna en caso de revertir
    op.drop_constraint('fk_tickets_tecnico_id', 'tickets', type_='foreignkey')
    op.drop_column('tickets', 'tecnico_id')