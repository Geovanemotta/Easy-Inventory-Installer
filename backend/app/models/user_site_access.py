from sqlalchemy import Column, ForeignKey, Table

from app.database import Base


user_site_access = Table(
    "user_site_access",
    Base.metadata,

    Column(
        "user_id",
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),

    Column(
        "site_id",
        ForeignKey("sites.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
