from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NetworkAsset(Base):
    __tablename__ = "network_assets"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    site_id: Mapped[int | None] = mapped_column(
        ForeignKey("sites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    nome: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    tipo: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Impressora",
        index=True,
    )

    ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
        index=True,
    )

    mac: Mapped[str | None] = mapped_column(
        String(17),
        nullable=True,
        index=True,
    )

    patrimonio: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    fabricante: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    modelo: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    numero_serie: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    localizacao: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    status_online: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
        default=None,
    )

    ultimo_ping: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    tempo_resposta_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    origem: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="manual",
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
