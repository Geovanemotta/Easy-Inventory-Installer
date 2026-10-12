"""add_two_factor_fields_to_users

Revision ID: 75b86e62e9be
Revises: c1f83a9d4b2e
Create Date: 2026-10-12 01:37:12.702104

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '75b86e62e9be'
down_revision: Union[str, Sequence[str], None] = 'a7f8e91d2c34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Adiciona colunas de 2FA caso não existam
    bind = op.get_bind()
    insp = sa.inspect(bind)
    columns = [c['name'] for c in insp.get_columns('users')]

    if 'two_factor_enabled' not in columns:
        op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default='false', nullable=False))
    if 'two_factor_secret' not in columns:
        op.add_column('users', sa.Column('two_factor_secret', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
