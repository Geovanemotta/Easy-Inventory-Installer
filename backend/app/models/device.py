from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("company_id", "hostname", name="uq_devices_company_hostname"),
    )

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

    hostname: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    loja: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
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

    sistema: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    versao: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    processador: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    ram_total: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    disco_total: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    disco_usado: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    disco_livre: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    disco_percentual: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    rustdesk_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )

    fabricante: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    modelo: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    serial: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    dominio: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    usuario: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    build: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    ip_secundario: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    ram_tipo: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    windows_release: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    alerta_hardware: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    analise_disco: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    extra_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    data_coleta: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    patrimonio: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    firewall_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    firewall_solicitado_por: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    firewall_solicitado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    firewall_confirmado_por: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    firewall_confirmado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
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
    site = relationship("Site")
    software = relationship(
        "DeviceSoftware",
        back_populates="device",
        cascade="all, delete-orphan",
    )
    history = relationship(
        "DeviceHistory",
        back_populates="device",
        cascade="all, delete-orphan",
        order_by="desc(DeviceHistory.data_alteracao)",
    )
