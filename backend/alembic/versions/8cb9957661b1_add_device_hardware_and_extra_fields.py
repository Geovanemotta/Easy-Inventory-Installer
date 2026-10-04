"""add_device_hardware_and_extra_fields

Revision ID: 8cb9957661b1
Revises: 4e5d3f229fe4
Create Date: 2026-10-03 14:25:16.712446

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8cb9957661b1'
down_revision: Union[str, Sequence[str], None] = '4e5d3f229fe4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('devices', sa.Column('fabricante', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('modelo', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('serial', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('dominio', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('usuario', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('build', sa.String(length=50), nullable=True))
    op.add_column('devices', sa.Column('ip_secundario', sa.String(length=150), nullable=True))
    op.add_column('devices', sa.Column('analise_disco', sa.JSON(), nullable=True))
    op.add_column('devices', sa.Column('extra_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('devices', 'extra_data')
    op.drop_column('devices', 'analise_disco')
    op.drop_column('devices', 'ip_secundario')
    op.drop_column('devices', 'build')
    op.drop_column('devices', 'usuario')
    op.drop_column('devices', 'dominio')
    op.drop_column('devices', 'serial')
    op.drop_column('devices', 'modelo')
    op.drop_column('devices', 'fabricante')
