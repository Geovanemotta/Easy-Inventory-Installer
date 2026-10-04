from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SoftwarePackage(Base):
    __tablename__ = "software_packages"

    __table_args__ = (
        UniqueConstraint(
            "device_software_id",
            "pacote",
            name="uq_device_software_package",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    device_software_id: Mapped[int] = mapped_column(
        ForeignKey("device_software.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    pacote: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    versao: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    device_software = relationship(
        "DeviceSoftware",
        back_populates="packages",
    )
