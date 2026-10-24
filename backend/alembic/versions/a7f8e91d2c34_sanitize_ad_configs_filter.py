"""sanitize_ad_configs_filter

Revision ID: a7f8e91d2c34
Revises: c1f83a9d4b2e
Create Date: 2026-10-08 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7f8e91d2c34'
down_revision: Union[str, Sequence[str], None] = 'c1f83a9d4b2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Sanitização neutra para ad_configs."""
    pass


def downgrade() -> None:
    pass
