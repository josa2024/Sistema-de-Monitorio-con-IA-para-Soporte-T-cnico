"""Crear tabla chat garantias final

Revision ID: 4788b0bf7212
Revises: a2b76f6d309a
Create Date: 2026-04-18 04:55:12.951347

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector # <-- Importación necesaria

# revision identifiers, used by Alembic.
revision: str = '4788b0bf7212'
down_revision: Union[str, Sequence[str], None] = 'a2b76f6d309a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Obtenemos la conexión actual y revisamos las tablas existentes
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    # 2. Solo creamos la tabla si NO existe ya en la base de datos de Innotrev
    if 'licencia_comments' not in existing_tables:
        op.create_table('licencia_comments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('licencia_id', sa.Integer(), nullable=False),
            sa.Column('autor_id', sa.Integer(), nullable=False),
            sa.Column('contenido', sa.String(length=1000), nullable=False),
            sa.Column('archivo_url', sa.String(length=512), nullable=True),
            sa.Column('fecha_creacion', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['autor_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['licencia_id'], ['garantias_licencias.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_licencia_comments_id'), 'licencia_comments', ['id'], unique=False)
        op.create_index(op.f('ix_licencia_comments_licencia_id'), 'licencia_comments', ['licencia_id'], unique=False)
    else:
        print("⚠️ La tabla 'licencia_comments' ya existe. Saltando creación para evitar DuplicateTable.")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_licencia_comments_licencia_id'), table_name='licencia_comments')
    op.drop_index(op.f('ix_licencia_comments_id'), table_name='licencia_comments')
    op.drop_table('licencia_comments')
