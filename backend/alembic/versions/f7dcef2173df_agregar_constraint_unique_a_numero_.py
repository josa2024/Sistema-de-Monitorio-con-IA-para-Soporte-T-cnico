"""agregar_constraint_unique_a_numero_serie_en_equipos

Revision ID: f7dcef2173df
Revises: 7ae8c9d4d923
Create Date: 2026-03-09 19:08:16.279128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7dcef2173df'
down_revision: Union[str, Sequence[str], None] = '7ae8c9d4d923'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_equipos_numero_serie', 'equipos', ['numero_serie'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_equipos_numero_serie', 'equipos', type_='unique')
