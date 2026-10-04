"""add_ram_tipo_windows_release_alerta_hardware

Revision ID: fbb933e9e76e
Revises: 4f92d620e39c
Create Date: 2026-10-04 18:33:33.174983

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbb933e9e76e'
down_revision: Union[str, Sequence[str], None] = '4f92d620e39c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'ram_tipo' not in columns:
        op.add_column('devices', sa.Column('ram_tipo', sa.String(length=50), nullable=True))
    if 'windows_release' not in columns:
        op.add_column('devices', sa.Column('windows_release', sa.String(length=50), nullable=True))
    if 'alerta_hardware' not in columns:
        op.add_column('devices', sa.Column('alerta_hardware', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'alerta_hardware' in columns:
        op.drop_column('devices', 'alerta_hardware')
    if 'windows_release' in columns:
        op.drop_column('devices', 'windows_release')
    if 'ram_tipo' in columns:
        op.drop_column('devices', 'ram_tipo')
