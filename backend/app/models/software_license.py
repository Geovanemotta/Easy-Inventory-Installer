from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SoftwareLicense(Base):
    __tablename__ = "software_licenses"

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

    categoria: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="windows",
        index=True,
    )  # 'windows' | 'office' | 'outro'

    software_nome: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    chave: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    tipo_licenca: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default="OEM",
    )  # 'OEM' | 'Retail / FPP' | 'Volume (MAK)' | 'KMS' | 'CSP / Assinatura'

    nota_fiscal: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    quantidade_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    observacoes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    data_aquisicao: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
