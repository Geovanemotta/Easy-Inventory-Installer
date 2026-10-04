from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token
from app.core.security import verify_password
from app.database import engine
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.api.dependencies.auth import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


from app.services.ldap_service import authenticate_ldap_user


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(data: LoginRequest):
    with Session(engine) as session:
        # 1. Tenta autenticação via Active Directory (LDAP) se configurado e ativo
        user = authenticate_ldap_user(session, data.username, data.password, company_id=1)

        # 2. Fallback: autenticação local do PostgreSQL (ex: usuário admin local)
        if user is None:
            user = session.scalar(
                select(User).where(
                    User.username == data.username,
                    User.active.is_(True),
                )
            )

            if user is None or not user.password_hash or not verify_password(
                data.password,
                user.password_hash,
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Usuário ou senha inválidos.",
                )

        token = create_access_token(user.id)

        return {
            "access_token": token,
            "token_type": "bearer",
        }


@router.get(
    "/me",
    response_model=UserResponse,
)
def me(
    current_user: User = Depends(get_current_user),
):
    return current_user
