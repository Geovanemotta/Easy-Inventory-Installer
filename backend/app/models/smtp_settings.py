from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SMTPSettings(Base):
    __tablename__ = "smtp_settings"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=1,
    )

    smtp_host: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )

    smtp_port: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=25,
    )

    smtp_user: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    smtp_password: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    use_tls: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    use_ssl: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    default_operator_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="",
    )

    default_subject_prefix: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Reserva de IP/MAC - Firewall",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
