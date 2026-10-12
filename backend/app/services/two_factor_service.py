import base64
import io
from typing import Tuple
import pyotp
import qrcode


def generate_totp_setup(username: str) -> Tuple[str, str, str]:
    """
    Gera uma chave secreta TOTP em Base32, a URI de provisionamento e o QR Code em Data URL.
    Retorna: (secret, provisioning_uri, qr_data_url)
    """
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=username,
        issuer_name="Giassi Inventário",
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=7,
        border=2,
    )
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    return secret, provisioning_uri, qr_data_url


def verify_totp_code(secret: str, code: str) -> bool:
    """
    Valida o código de 6 dígitos fornecido pelo usuário.
    Tolerância de janela de 1 intervalo (30s antes ou depois para compensar relógios descalibrados).
    """
    if not secret or not code:
        return False
    clean_code = str(code).strip().replace(" ", "").replace("-", "")
    if len(clean_code) != 6 or not clean_code.isdigit():
        return False
    totp = pyotp.TOTP(secret)
    return bool(totp.verify(clean_code, valid_window=1))
