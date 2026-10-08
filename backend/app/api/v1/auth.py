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
from app.core.session_vault import (
    store_ad_session_cred,
    has_ad_session_cred,
    clear_ad_session_cred,
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(data: LoginRequest):
    with Session(engine) as session:
        # 1. Tenta autenticação via Active Directory (LDAP) se configurado e ativo
        user = authenticate_ldap_user(session, data.username, data.password, company_id=1)
        if user is not None:
            # Armazena temporariamente a credencial em memória RAM para SSH nas máquinas
            store_ad_session_cred(user.id, data.username, data.password)

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
    role_slugs = [r.slug for r in current_user.roles] if current_user.roles else []
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "company_id": current_user.company_id,
        "is_superadmin": current_user.is_superadmin,
        "roles": role_slugs,
        "has_ad_session": has_ad_session_cred(current_user.id),
    }


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
):
    clear_ad_session_cred(current_user.id)
    return {"message": "Sessão encerrada com sucesso."}

