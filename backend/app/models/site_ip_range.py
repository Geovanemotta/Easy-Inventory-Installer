from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SiteIpRange(Base):
    __tablename__ = "site_ip_ranges"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    site_id: Mapped[int] = mapped_column(
        ForeignKey("sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    nome: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    ip_inicio: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
        index=True,
    )

    ip_fim: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
        index=True,
    )

    gateway: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    mascara: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    observacoes: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
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
    site = relationship("Site")
