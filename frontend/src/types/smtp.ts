export interface SMTPConfig {
  id?: number | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string | null;
  smtp_password?: string | null;
  has_smtp_password?: boolean;
  use_tls: boolean;
  use_ssl: boolean;
  default_operator_email: string;
  default_subject_prefix: string;
}

export interface SMTPTestRequest {
  recipient_email: string;
}

export interface SMTPTestResponse {
  success: boolean;
  message: string;
}
