"""clean_noisy_device_history

Revision ID: 9e1a8b7c3d2e
Revises: 75b86e62e9be
Create Date: 2026-10-13 10:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e1a8b7c3d2e'
down_revision: Union[str, Sequence[str], None] = '75b86e62e9be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Remove registros voláteis e irrelevantes do histórico de dispositivos
    (usuários logados, domínios transitórios, ID rustdesk e periféricos),
    mantendo apenas alterações críticas de hardware, SO, hostname, IP e patrimônio.
    """
    op.execute(
        "DELETE FROM device_history WHERE campo IN ('USUARIO', 'DOMINIO', 'RUSTDESK_ID', 'PERIFERICOS')"
    )


def downgrade() -> None:
    pass
