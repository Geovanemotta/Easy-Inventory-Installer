from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import (
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
)


def create_access_token(
    user_id: int,
) -> str:

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def create_temp_2fa_token(
    user_id: int,
    setup_secret: str | None = None,
) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    payload = {
        "sub": str(user_id),
        "type": "2fa_pending",
        "exp": expires_at,
    }
    if setup_secret:
        payload["setup_secret"] = setup_secret

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_temp_2fa_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        if payload.get("type") != "2fa_pending":
            return None
        return payload
    except Exception:
        return None
