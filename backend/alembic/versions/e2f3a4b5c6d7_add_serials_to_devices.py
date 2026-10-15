"""add_serials_to_devices

Revision ID: e2f3a4b5c6d7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-15 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'serial_windows' not in columns:
        op.add_column('devices', sa.Column('serial_windows', sa.String(length=100), nullable=True))
    if 'serial_office' not in columns:
        op.add_column('devices', sa.Column('serial_office', sa.String(length=100), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'serial_office' in columns:
        op.drop_column('devices', 'serial_office')
    if 'serial_windows' in columns:
        op.drop_column('devices', 'serial_windows')
