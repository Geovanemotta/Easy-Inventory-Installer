"""sync_operador_matriz_permissions

Revision ID: 602139e9d3b6
Revises: 82e34bf51a92
Create Date: 2026-10-06 02:39:25.482712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '602139e9d3b6'
down_revision: Union[str, Sequence[str], None] = '82e34bf51a92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # 1. Garante permissões básicas
    conn.execute(sa.text("""
        INSERT INTO permissions (name, slug, description, active, created_at)
        VALUES 
            ('Visualizar Lojas', 'sites.view', 'Permissão para visualizar lojas', true, NOW()),
            ('Visualizar Inventário', 'inventory.view', 'Permissão para visualizar dados de inventário', true, NOW())
        ON CONFLICT (slug) DO NOTHING;
    """))

    # 2. Garante papel de operador_matriz
    conn.execute(sa.text("""
        INSERT INTO roles (name, slug, description, active, created_at, updated_at)
        VALUES ('Operador Matriz', 'operador_matriz', 'Acesso ao inventário geral, ativos de rede e relatórios com fluxo de homologação no firewall.', true, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE 
            SET description = EXCLUDED.description,
                updated_at = NOW();
    """))

    # 3. Garante associação entre operador_matriz e as permissões de visualização
    conn.execute(sa.text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.slug = 'operador_matriz'
          AND p.slug IN ('sites.view', 'inventory.view')
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    conn.execute(sa.text("""
        DELETE FROM role_permissions
        WHERE role_id IN (SELECT id FROM roles WHERE slug = 'operador_matriz');
    """))
