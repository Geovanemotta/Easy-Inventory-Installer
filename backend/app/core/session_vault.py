import base64
import hashlib
import time
from typing import Optional, Tuple
from cryptography.fernet import Fernet

from app.core.config import JWT_SECRET_KEY

# Chave simétrica derivada do JWT_SECRET_KEY da aplicação para encriptar senhas em memória RAM
_fernet_key = base64.urlsafe_b64encode(hashlib.sha256(JWT_SECRET_KEY.encode()).digest())
_cipher = Fernet(_fernet_key)

# Cofre efêmero estritamente em memória RAM:
# Mapeia { user_id: (encrypted_password_bytes, expires_at_timestamp, username) }
# NUNCA grava em disco, NUNCA grava no banco de dados e expira junto com a sessão.
_memory_vault: dict[int, tuple[bytes, float, str]] = {}


def store_ad_session_cred(user_id: int, username: str, password: str, ttl_seconds: int = 86400) -> None:
    """
    Armazena temporariamente a credencial de login do AD na memória volátil do servidor
    para permitir conexões SSH automáticas e seguras às máquinas corporativas.
    """
    if not password:
        return
    encrypted = _cipher.encrypt(password.encode("utf-8"))
    _memory_vault[user_id] = (encrypted, time.time() + ttl_seconds, username)


def get_ad_session_cred(user_id: int) -> Tuple[Optional[str], Optional[str]]:
    """
    Recupera (username, password) desencriptados da memória da sessão do usuário.
    Retorna (None, None) se expirado ou não existente.
    """
    data = _memory_vault.get(user_id)
    if not data:
        return None, None
    encrypted, expires_at, username = data
    if time.time() > expires_at:
        _memory_vault.pop(user_id, None)
        return None, None
    try:
        decrypted_pw = _cipher.decrypt(encrypted).decode("utf-8")
        return username, decrypted_pw
    except Exception:
        return username, None


def has_ad_session_cred(user_id: int) -> bool:
    """Verifica se há credencial ativa de sessão em memória para este usuário."""
    data = _memory_vault.get(user_id)
    if not data:
        return False
    _, expires_at, _ = data
    if time.time() > expires_at:
        _memory_vault.pop(user_id, None)
        return False
    return True


def clear_ad_session_cred(user_id: int) -> None:
    """Limpa a credencial da memória (ex: ao fazer logout)."""
    _memory_vault.pop(user_id, None)
