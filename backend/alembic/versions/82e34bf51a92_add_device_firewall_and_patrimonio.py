"""add_device_firewall_and_patrimonio

Revision ID: 82e34bf51a92
Revises: 7150e904417d
Create Date: 2026-10-05 22:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82e34bf51a92'
down_revision: Union[str, Sequence[str], None] = '7150e904417d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'patrimonio' not in columns:
        op.add_column('devices', sa.Column('patrimonio', sa.String(length=50), nullable=True))
    if 'firewall_status' not in columns:
        op.add_column('devices', sa.Column('firewall_status', sa.String(length=30), nullable=True))
    if 'firewall_solicitado_por' not in columns:
        op.add_column('devices', sa.Column('firewall_solicitado_por', sa.String(length=100), nullable=True))
    if 'firewall_solicitado_em' not in columns:
        op.add_column('devices', sa.Column('firewall_solicitado_em', sa.DateTime(timezone=True), nullable=True))
    if 'firewall_confirmado_por' not in columns:
        op.add_column('devices', sa.Column('firewall_confirmado_por', sa.String(length=100), nullable=True))
    if 'firewall_confirmado_em' not in columns:
        op.add_column('devices', sa.Column('firewall_confirmado_em', sa.DateTime(timezone=True), nullable=True))

    # Criação do perfil operador_matriz se ainda não existir
    conn.execute(sa.text("""
        INSERT INTO roles (name, slug, description, active, created_at, updated_at)
        VALUES ('Operador Matriz', 'operador_matriz', 'Acesso ao inventário geral, ativos de rede e relatórios com fluxo de homologação no firewall.', true, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING;
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('devices')]

    if 'firewall_confirmado_em' in columns:
        op.drop_column('devices', 'firewall_confirmado_em')
    if 'firewall_confirmado_por' in columns:
        op.drop_column('devices', 'firewall_confirmado_por')
    if 'firewall_solicitado_em' in columns:
        op.drop_column('devices', 'firewall_solicitado_em')
    if 'firewall_solicitado_por' in columns:
        op.drop_column('devices', 'firewall_solicitado_por')
    if 'firewall_status' in columns:
        op.drop_column('devices', 'firewall_status')
    if 'patrimonio' in columns:
        op.drop_column('devices', 'patrimonio')
