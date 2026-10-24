from datetime import datetime
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
import logging
import smtplib
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device_history import DeviceHistory
from app.models.smtp_settings import SMTPSettings

logger = logging.getLogger(__name__)


def get_smtp_settings(session: Session, company_id: int = 1) -> Optional[SMTPSettings]:
    """Retorna as configurações de SMTP da empresa."""
    return session.scalar(
        select(SMTPSettings).where(SMTPSettings.company_id == company_id)
    )


def test_smtp_connection(
    session: Session,
    company_id: int,
    recipient_email: str,
) -> dict:
    """Dispara um e-mail de teste para validar os parâmetros de conexão SMTP."""
    cfg = get_smtp_settings(session, company_id)
    if not cfg or not cfg.smtp_host:
        raise HTTPException(
            status_code=400,
            detail="Servidor SMTP não configurado. Por favor, configure os parâmetros de SMTP primeiro.",
        )

    recipient = recipient_email.strip()
    if not recipient or "@" not in recipient:
        raise HTTPException(
            status_code=400,
            detail="Endereço de e-mail do destinatário inválido.",
        )

    sender = cfg.smtp_user if (cfg.smtp_user and "@" in cfg.smtp_user) else recipient

    test_body = (
        "Olá,\n\nEste é um e-mail de teste disparado pelo ZenithMap para validar a conectividade e autenticação com o servidor SMTP.\n\n"
        f"Servidor: {cfg.smtp_host}:{cfg.smtp_port}\n"
        f"TLS: {cfg.use_tls} | SSL: {cfg.use_ssl}\n"
        f"Data do teste: {datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S UTC')}\n\n"
        "Configuração validada com sucesso!"
    )
    msg = EmailMessage()
    msg["Subject"] = "Teste de Conexão SMTP - ZenithMap"
    msg["From"] = sender
    msg["To"] = recipient
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    msg.set_content(test_body)

    try:
        server = None
        if cfg.use_ssl or cfg.smtp_port == 465:
            server = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=12)

        server.ehlo()
        if cfg.use_tls and not (cfg.use_ssl or cfg.smtp_port == 465):
            server.starttls()
            server.ehlo()

        if cfg.smtp_user and cfg.smtp_password:
            server.login(cfg.smtp_user, cfg.smtp_password)

        server.sendmail(sender, [recipient], msg.as_string())
        server.quit()
        return {
            "success": True,
            "message": f"E-mail de teste enviado com sucesso para {recipient}.",
        }
    except Exception as e:
        logger.error(f"Erro ao testar envio SMTP para {recipient}: {e}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Falha na comunicação com o servidor SMTP: {str(e)}",
        )


def send_firewall_reservation_email(
    session: Session,
    company_id: int,
    operator_email: str,
    sender_email: str,
    circuito: str,
    vlan_name: str,
    ip_address: str,
    mac_address: str,
    device_id: Optional[int] = None,
    admin_name: Optional[str] = None,
) -> dict:
    """
    Envia o e-mail de reserva de IP/MAC para a operadora e registra no histórico do dispositivo.
    """
    cfg = get_smtp_settings(session, company_id)
    if not cfg or not cfg.smtp_host:
        raise HTTPException(
            status_code=400,
            detail="Servidor SMTP não configurado. Por favor, defina as configurações de SMTP antes de solicitar a reserva.",
        )

    op_email = (operator_email or "").strip()
    snd_email = (sender_email or "").strip()
    circ = (circuito or "").strip()
    vlan = (vlan_name or "").strip()
    ip = (ip_address or "").strip()
    mac = (mac_address or "").strip()

    if not op_email or "@" not in op_email:
        raise HTTPException(status_code=400, detail="E-mail da operadora inválido.")
    if not snd_email or "@" not in snd_email:
        raise HTTPException(status_code=400, detail="E-mail do remetente (admin) inválido.")
    if not circ:
        raise HTTPException(status_code=400, detail="Identificador do circuito é obrigatório.")
    if not ip:
        raise HTTPException(status_code=400, detail="Endereço IP é obrigatório.")
    if not mac:
        raise HTTPException(status_code=400, detail="Endereço MAC é obrigatório.")

    # Monta o corpo estrito conforme especificação
    body = (
        "Favor cadastrar o MAC na seguinte reserva de IP do circuito abaixo, caso ja exista um cadastro no IP, apenas substituir.\n\n"
        f"Circuito: {circ}\n"
        f"VLAN: {vlan}\n"
        f"IP: {ip}\n"
        f"MAC: {mac}\n"
    )

    prefix = (cfg.default_subject_prefix or "Reserva de IP/MAC - Firewall").strip()
    subject = f"{prefix} - {circ} - {ip}"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = snd_email
    msg["To"] = op_email
    msg["Cc"] = snd_email
    msg["Reply-To"] = snd_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    msg.set_content(body)

    # Destinatários reais do envelope SMTP (Para e Cópia)
    destinatarios = [op_email]
    if snd_email.lower() != op_email.lower():
        destinatarios.append(snd_email)

    try:
        server = None
        if cfg.use_ssl or cfg.smtp_port == 465:
            server = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=15)

        server.ehlo()
        if cfg.use_tls and not (cfg.use_ssl or cfg.smtp_port == 465):
            server.starttls()
            server.ehlo()

        if cfg.smtp_user and cfg.smtp_password:
            server.login(cfg.smtp_user, cfg.smtp_password)

        # Envia com remetente do envelope sendo o sender_email (ou conta autenticada se o relay exigir)
        envelope_from = snd_email
        server.sendmail(envelope_from, destinatarios, msg.as_string())
        server.quit()

    except Exception as e:
        logger.error(f"Erro ao enviar e-mail de reserva para operadora: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao enviar e-mail para a operadora via SMTP: {str(e)}",
        )

    # Registra no histórico do dispositivo
    if device_id:
        usuario_responsavel = admin_name or snd_email
        detalhes_historico = (
            f"Solicitação de reserva de IP/MAC enviada para {op_email} pelo remetente {snd_email}. "
            f"Circuito: {circ} | VLAN: {vlan} | IP: {ip} | MAC: {mac}"
        )
        session.add(
            DeviceHistory(
                device_id=device_id,
                campo="FIREWALL_EMAIL_ENVIADO",
                valor_anterior="",
                valor_novo=detalhes_historico[:1000],
                alterado_por=usuario_responsavel,
                data_alteracao=datetime.utcnow(),
            )
        )
        session.flush()

    return {
        "success": True,
        "message": f"E-mail de reserva enviado com sucesso para {op_email} com cópia para {snd_email}.",
    }
