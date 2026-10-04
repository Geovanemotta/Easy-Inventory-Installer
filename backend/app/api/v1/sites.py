from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.database import engine
from app.models import Site, User, user_site_access
from app.schemas.site import SiteResponse


router = APIRouter(
    prefix="/sites",
    tags=["Sites"],
)


@router.get(
    "",
    response_model=list[SiteResponse],
)
def list_sites(
    current_user: User = Depends(get_current_user),
):

    with Session(engine) as session:

        # -----------------------------------------
        # SUPER ADMIN
        # -----------------------------------------

        if current_user.is_superadmin:

            sites = session.scalars(
                select(Site)
                .where(
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                )
                .order_by(Site.code)
            ).all()

        # -----------------------------------------
        # USUÁRIO NORMAL
        # -----------------------------------------

        else:

            sites = session.scalars(
                select(Site)
                .join(
                    user_site_access,
                    user_site_access.c.site_id == Site.id,
                )
                .where(
                    Site.company_id == current_user.company_id,
                    Site.active.is_(True),
                    user_site_access.c.user_id == current_user.id,
                )
                .order_by(Site.code)
            ).all()

        return sites
