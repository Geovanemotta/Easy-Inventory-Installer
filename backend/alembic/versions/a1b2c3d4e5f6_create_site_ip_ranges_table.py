"""create_site_ip_ranges_table

Revision ID: a1b2c3d4e5f6
Revises: 9e1a8b7c3d2e
Create Date: 2026-10-14 23:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9e1a8b7c3d2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'site_ip_ranges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('ip_inicio', sa.String(length=45), nullable=False),
        sa.Column('ip_fim', sa.String(length=45), nullable=False),
        sa.Column('gateway', sa.String(length=45), nullable=True),
        sa.Column('mascara', sa.String(length=45), nullable=True),
        sa.Column('observacoes', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_site_ip_ranges_company_id'), 'site_ip_ranges', ['company_id'], unique=False)
    op.create_index(op.f('ix_site_ip_ranges_site_id'), 'site_ip_ranges', ['site_id'], unique=False)
    op.create_index(op.f('ix_site_ip_ranges_ip_inicio'), 'site_ip_ranges', ['ip_inicio'], unique=False)
    op.create_index(op.f('ix_site_ip_ranges_ip_fim'), 'site_ip_ranges', ['ip_fim'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_site_ip_ranges_ip_fim'), table_name='site_ip_ranges')
    op.drop_index(op.f('ix_site_ip_ranges_ip_inicio'), table_name='site_ip_ranges')
    op.drop_index(op.f('ix_site_ip_ranges_site_id'), table_name='site_ip_ranges')
    op.drop_index(op.f('ix_site_ip_ranges_company_id'), table_name='site_ip_ranges')
    op.drop_table('site_ip_ranges')
