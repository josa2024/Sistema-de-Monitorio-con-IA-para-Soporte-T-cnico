"""create licenses table

Revision ID: 3f8a9b2c1d4e
Revises: 
Create Date: 2024-05-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3f8a9b2c1d4e'
down_revision = '135cfa074b99' 
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('licenses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_key', sa.String(), nullable=True),
    sa.Column('file_path', sa.String(), nullable=True),
    sa.Column('filename', sa.String(), nullable=True),
    sa.Column('fecha_creacion', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('equipo_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['equipo_id'], ['equipos.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_licenses_id'), 'licenses', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_licenses_id'), table_name='licenses')
    op.drop_table('licenses')