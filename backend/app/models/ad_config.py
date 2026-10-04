from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ADConfig(Base):
    __tablename__ = "ad_configs"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=1,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    server_host: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )

    server_port: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=389,
    )

    use_ssl: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    use_tls: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    domain: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="",
    )

    base_dn: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )

    bind_user: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    bind_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    user_search_filter: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="(&(objectClass=user)(sAMAccountName={username}))",
    )

    superadmin_groups: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    group_mappings: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    default_role_id: Mapped[int | None] = mapped_column(
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
    )

    auto_sync_on_login: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    default_role = relationship("Role")
