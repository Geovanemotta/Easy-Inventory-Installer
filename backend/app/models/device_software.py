from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DeviceSoftware(Base):
    __tablename__ = "device_software"

    __table_args__ = (
        UniqueConstraint(
            "device_id",
            "software_id",
            name="uq_device_software",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    software_id: Mapped[int] = mapped_column(
        ForeignKey("software.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    installed: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
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

    device = relationship(
        "Device",
        back_populates="software",
    )

    software = relationship(
        "Software",
        back_populates="device_software",
    )

    packages = relationship(
        "SoftwarePackage",
        back_populates="device_software",
        cascade="all, delete-orphan",
    )
