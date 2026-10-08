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
    """Sanitiza qualquer registro corrompido em ad_configs."""
    op.execute("""
        UPDATE ad_configs
        SET user_search_filter = '(&(objectClass=user)(sAMAccountName={username})(memberOf:1.2.840.113556.1.4.1941:=CN=JumpServer_Users,OU=Jump-Server,OU=Grupos,OU=Servidores,OU=Matriz,OU=giassisuper,DC=giassisuper,DC=corp))'
        WHERE user_search_filter LIKE '%(&(ob(%'
           OR user_search_filter LIKE '%))jectClass=user)%';
    """)


def downgrade() -> None:
    pass
