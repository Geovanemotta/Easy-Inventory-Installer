"""add_patrimonio_recadastro_and_history_fields

Revision ID: b8c9d0e1f2a3
Revises: f3a4b5c6d7e8
Create Date: 2026-10-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'f3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if 'devices' in tables:
        device_cols = [c['name'] for c in insp.get_columns('devices')]
        if 'ip_definitivo' not in device_cols:
            op.add_column('devices', sa.Column('ip_definitivo', sa.String(length=45), nullable=True))
        if 'licenca_windows_solicitada' not in device_cols:
            op.add_column('devices', sa.Column('licenca_windows_solicitada', sa.Boolean(), nullable=False, server_default=sa.false()))
        if 'motivo_alteracao' not in device_cols:
            op.add_column('devices', sa.Column('motivo_alteracao', sa.String(length=500), nullable=True))
        if 'observacao_admin' not in device_cols:
            op.add_column('devices', sa.Column('observacao_admin', sa.String(length=500), nullable=True))
        if 'so_anterior' not in device_cols:
            op.add_column('devices', sa.Column('so_anterior', sa.String(length=150), nullable=True))

    if 'device_history' in tables:
        history_cols = [c['name'] for c in insp.get_columns('device_history')]
        if 'alterado_por' not in history_cols:
            op.add_column('device_history', sa.Column('alterado_por', sa.String(length=150), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = insp.get_table_names()

    if 'device_history' in tables:
        history_cols = [c['name'] for c in insp.get_columns('device_history')]
        if 'alterado_por' in history_cols:
            op.drop_column('device_history', 'alterado_por')

    if 'devices' in tables:
        device_cols = [c['name'] for c in insp.get_columns('devices')]
        if 'so_anterior' in device_cols:
            op.drop_column('devices', 'so_anterior')
        if 'observacao_admin' in device_cols:
            op.drop_column('devices', 'observacao_admin')
        if 'motivo_alteracao' in device_cols:
            op.drop_column('devices', 'motivo_alteracao')
        if 'licenca_windows_solicitada' in device_cols:
            op.drop_column('devices', 'licenca_windows_solicitada')
        if 'ip_definitivo' in device_cols:
            op.drop_column('devices', 'ip_definitivo')
