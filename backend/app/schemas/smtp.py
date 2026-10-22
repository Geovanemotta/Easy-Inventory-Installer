from typing import Optional
from pydantic import BaseModel, Field


class SMTPConfigResponse(BaseModel):
    id: Optional[int] = None
    smtp_host: str = ""
    smtp_port: int = 25
    smtp_user: Optional[str] = None
    has_smtp_password: bool = False
    use_tls: bool = False
    use_ssl: bool = False
    default_operator_email: str = ""
    default_subject_prefix: str = "Reserva de IP/MAC - Firewall"


class SMTPConfigUpdate(BaseModel):
    smtp_host: str = Field(..., description="Servidor SMTP (Host ou IP)")
    smtp_port: int = Field(25, description="Porta do servidor SMTP")
    smtp_user: Optional[str] = Field(None, description="Usuário para autenticação no SMTP")
    smtp_password: Optional[str] = Field(None, description="Senha do SMTP (deixe em branco para não alterar)")
    use_tls: bool = Field(False, description="Habilitar STARTTLS (ex: porta 587)")
    use_ssl: bool = Field(False, description="Habilitar SSL direto (ex: porta 465)")
    default_operator_email: str = Field("", description="E-mail padrão da operadora para homologação")
    default_subject_prefix: str = Field("Reserva de IP/MAC - Firewall", description="Prefixo padrão do assunto")


class SMTPTestRequest(BaseModel):
    recipient_email: str = Field(..., description="E-mail para envio do teste")
