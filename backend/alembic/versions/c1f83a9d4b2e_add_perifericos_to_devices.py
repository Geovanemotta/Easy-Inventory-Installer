"""add_perifericos_to_devices

Revision ID: c1f83a9d4b2e
Revises: 602139e9d3b6
Create Date: 2026-10-07 13:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1f83a9d4b2e'
down_revision: Union[str, Sequence[str], None] = '602139e9d3b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('devices', sa.Column('perifericos', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('devices', 'perifericos')
