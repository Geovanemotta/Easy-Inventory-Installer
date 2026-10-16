"""create_software_licenses_table

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-10-15 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, Sequence[str], None] = 'e2f3a4b5c6d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if 'software_licenses' not in tables:
        op.create_table(
            'software_licenses',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('company_id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('categoria', sa.String(length=30), nullable=False, server_default='windows'),
            sa.Column('software_nome', sa.String(length=150), nullable=False),
            sa.Column('chave', sa.String(length=100), nullable=False),
            sa.Column('tipo_licenca', sa.String(length=50), nullable=True, server_default='OEM'),
            sa.Column('nota_fiscal', sa.String(length=100), nullable=True),
            sa.Column('quantidade_total', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('observacoes', sa.Text(), nullable=True),
            sa.Column('data_aquisicao', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_software_licenses_company_id'), 'software_licenses', ['company_id'], unique=False)
        op.create_index(op.f('ix_software_licenses_site_id'), 'software_licenses', ['site_id'], unique=False)
        op.create_index(op.f('ix_software_licenses_categoria'), 'software_licenses', ['categoria'], unique=False)
        op.create_index(op.f('ix_software_licenses_software_nome'), 'software_licenses', ['software_nome'], unique=False)
        op.create_index(op.f('ix_software_licenses_chave'), 'software_licenses', ['chave'], unique=False)
        op.create_index(op.f('ix_software_licenses_nota_fiscal'), 'software_licenses', ['nota_fiscal'], unique=False)

    if 'network_assets' in tables:
        asset_cols = [c['name'] for c in insp.get_columns('network_assets')]
        if 'serial_windows' not in asset_cols:
            op.add_column('network_assets', sa.Column('serial_windows', sa.String(length=100), nullable=True))
        if 'serial_office' not in asset_cols:
            op.add_column('network_assets', sa.Column('serial_office', sa.String(length=100), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if 'network_assets' in tables:
        asset_cols = [c['name'] for c in insp.get_columns('network_assets')]
        if 'serial_office' in asset_cols:
            op.drop_column('network_assets', 'serial_office')
        if 'serial_windows' in asset_cols:
            op.drop_column('network_assets', 'serial_windows')

    if 'software_licenses' in tables:
        op.drop_index(op.f('ix_software_licenses_nota_fiscal'), table_name='software_licenses')
        op.drop_index(op.f('ix_software_licenses_chave'), table_name='software_licenses')
        op.drop_index(op.f('ix_software_licenses_software_nome'), table_name='software_licenses')
        op.drop_index(op.f('ix_software_licenses_categoria'), table_name='software_licenses')
        op.drop_index(op.f('ix_software_licenses_site_id'), table_name='software_licenses')
        op.drop_index(op.f('ix_software_licenses_company_id'), table_name='software_licenses')
        op.drop_table('software_licenses')
