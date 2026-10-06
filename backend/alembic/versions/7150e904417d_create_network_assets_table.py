"""create_network_assets_table

Revision ID: 7150e904417d
Revises: fbb933e9e76e
Create Date: 2026-10-05 21:34:46.885297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7150e904417d'
down_revision: Union[str, Sequence[str], None] = 'fbb933e9e76e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'network_assets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('site_id', sa.Integer(), nullable=True),
        sa.Column('nome', sa.String(length=150), nullable=False),
        sa.Column('tipo', sa.String(length=50), server_default='Impressora', nullable=False),
        sa.Column('ip', sa.String(length=45), nullable=True),
        sa.Column('mac', sa.String(length=17), nullable=True),
        sa.Column('patrimonio', sa.String(length=50), nullable=True),
        sa.Column('fabricante', sa.String(length=100), nullable=True),
        sa.Column('modelo', sa.String(length=100), nullable=True),
        sa.Column('numero_serie', sa.String(length=100), nullable=True),
        sa.Column('localizacao', sa.String(length=150), nullable=True),
        sa.Column('status_online', sa.Boolean(), nullable=True),
        sa.Column('ultimo_ping', sa.DateTime(timezone=True), nullable=True),
        sa.Column('tempo_resposta_ms', sa.Integer(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('origem', sa.String(length=50), server_default='manual', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_network_assets_company_id'), 'network_assets', ['company_id'], unique=False)
    op.create_index(op.f('ix_network_assets_site_id'), 'network_assets', ['site_id'], unique=False)
    op.create_index(op.f('ix_network_assets_nome'), 'network_assets', ['nome'], unique=False)
    op.create_index(op.f('ix_network_assets_tipo'), 'network_assets', ['tipo'], unique=False)
    op.create_index(op.f('ix_network_assets_ip'), 'network_assets', ['ip'], unique=False)
    op.create_index(op.f('ix_network_assets_mac'), 'network_assets', ['mac'], unique=False)
    op.create_index(op.f('ix_network_assets_patrimonio'), 'network_assets', ['patrimonio'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_network_assets_patrimonio'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_mac'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_ip'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_tipo'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_nome'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_site_id'), table_name='network_assets')
    op.drop_index(op.f('ix_network_assets_company_id'), table_name='network_assets')
    op.drop_table('network_assets')
