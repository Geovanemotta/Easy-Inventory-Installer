from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SoftwareHistory(Base):
    __tablename__ = "software_history"

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

    versao_anterior: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    versao_nova: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    data_alteracao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    device_software = relationship("DeviceSoftware")
