"""add_site_circuito_and_smtp_settings

Revision ID: c2d3e4f5a6b7
Revises: b8c9d0e1f2a3
Create Date: 2026-10-22 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    # 1. Coluna circuito em sites
    if 'sites' in tables:
        site_cols = [c['name'] for c in insp.get_columns('sites')]
        if 'circuito' not in site_cols:
            op.add_column('sites', sa.Column('circuito', sa.String(length=100), nullable=True))

    # 2. Tabela smtp_settings
    if 'smtp_settings' not in tables:
        op.create_table(
            'smtp_settings',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
            sa.Column('smtp_host', sa.String(length=255), nullable=False, server_default=''),
            sa.Column('smtp_port', sa.Integer(), nullable=False, server_default='25'),
            sa.Column('smtp_user', sa.String(length=255), nullable=True),
            sa.Column('smtp_password', sa.String(length=255), nullable=True),
            sa.Column('use_tls', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('use_ssl', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('default_operator_email', sa.String(length=255), nullable=False, server_default=''),
            sa.Column('default_subject_prefix', sa.String(length=255), nullable=False, server_default='Reserva de IP/MAC - Firewall'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('(NOW() AT TIME ZONE \'UTC\')')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('(NOW() AT TIME ZONE \'UTC\')')),
        )
        op.create_index('ix_smtp_settings_company_id', 'smtp_settings', ['company_id'])


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if 'smtp_settings' in tables:
        op.drop_table('smtp_settings')

    if 'sites' in tables:
        site_cols = [c['name'] for c in insp.get_columns('sites')]
        if 'circuito' in site_cols:
            op.drop_column('sites', 'circuito')
