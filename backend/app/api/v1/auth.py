from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token, create_temp_2fa_token, decode_temp_2fa_token
from app.core.security import verify_password
from app.database import engine
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    Verify2FARequest,
)
from app.api.dependencies.auth import get_current_user
from app.services.ldap_service import authenticate_ldap_user
from app.services.two_factor_service import generate_totp_setup, verify_totp_code
from app.core.session_vault import (
    store_ad_session_cred,
    has_ad_session_cred,
    clear_ad_session_cred,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
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

        # 3. Autenticação em 2 Etapas (2FA) Obrigatória
        if user.two_factor_enabled and user.two_factor_secret:
            # Usuário já possui 2FA configurado: solicita código de 6 dígitos
            temp_token = create_temp_2fa_token(user.id)
            return {
                "requires_2fa": True,
                "temp_token": temp_token,
            }
        else:
            # Primeiro login: provisionamento obrigatório de 2FA
            secret, uri, qr_code = generate_totp_setup(user.username)
            temp_token = create_temp_2fa_token(user.id, setup_secret=secret)
            return {
                "setup_2fa_required": True,
                "temp_token": temp_token,
                "secret": secret,
                "qr_code": qr_code,
                "otpauth_url": uri,
            }


@router.post(
    "/verify-2fa",
    response_model=TokenResponse,
)
def verify_2fa(data: Verify2FARequest):
    payload = decode_temp_2fa_token(data.temp_token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Sessão de autenticação temporária expirada ou inválida. Faça login novamente.",
        )

    user_id = int(payload["sub"])
    setup_secret = payload.get("setup_secret")

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user or not user.active:
            raise HTTPException(status_code=401, detail="Usuário inativo ou inexistente.")

        if setup_secret:
            # Confirmação do primeiro cadastro de 2FA
            if not verify_totp_code(setup_secret, data.code):
                raise HTTPException(
                    status_code=400,
                    detail="Código de autenticação incorreto. Verifique o código no seu aplicativo autenticador e tente novamente.",
                )
            user.two_factor_enabled = True
            user.two_factor_secret = setup_secret
            session.commit()
        else:
            # Validação normal de login existente com 2FA
            if not user.two_factor_secret or not verify_totp_code(user.two_factor_secret, data.code):
                raise HTTPException(
                    status_code=400,
                    detail="Código de autenticação 2FA incorreto ou expirado.",
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
        "two_factor_enabled": current_user.two_factor_enabled,
    }


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
):
    clear_ad_session_cred(current_user.id)
    return {"message": "Sessão encerrada com sucesso."}


@router.get("/users")
def list_users(
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_superadmin or any(r.slug == "admin" for r in current_user.roles)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    with Session(engine) as session:
        users = session.scalars(
            select(User).order_by(User.full_name.asc())
        ).all()

        return [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "auth_source": u.auth_source,
                "active": u.active,
                "is_superadmin": u.is_superadmin,
                "two_factor_enabled": u.two_factor_enabled,
                "roles": [r.name for r in u.roles] if u.roles else [],
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]


@router.post("/users/{user_id}/reset-2fa")
def reset_user_2fa(
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.is_superadmin or any(r.slug == "admin" for r in current_user.roles)
    if not is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Apenas administradores podem resetar o 2FA de outros usuários.")

    with Session(engine) as session:
        target_user = session.get(User, user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        target_user.two_factor_enabled = False
        target_user.two_factor_secret = None
        session.commit()

        # Reseta simultaneamente no MeshCentral para manter sincronizado
        try:
            from app.services.meshcentral_service import reset_meshcentral_user_2fa
            reset_meshcentral_user_2fa(target_user.username)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"O 2FA do usuário '{target_user.username}' foi resetado com sucesso no Inventário e no MeshCentral! No próximo login, um novo QR Code será exigido.",
        }
