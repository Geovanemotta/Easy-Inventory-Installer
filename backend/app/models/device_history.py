from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DeviceHistory(Base):
    __tablename__ = "device_history"

    id: Mapped[int] = mapped_column(primary_key=True)

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    campo: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    valor_anterior: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    valor_novo: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    device = relationship("Device", back_populates="history")
