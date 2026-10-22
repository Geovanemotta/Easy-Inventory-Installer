import { apiRequest } from './apiClient';
import type { SMTPConfig, SMTPTestResponse } from '../types/smtp';

export async function getSMTPConfig(): Promise<SMTPConfig> {
  return apiRequest<SMTPConfig>('/ad/smtp-config');
}

export async function saveSMTPConfig(data: SMTPConfig): Promise<SMTPConfig> {
  return apiRequest<SMTPConfig>('/ad/smtp-config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function testSMTPConnection(recipient_email: string): Promise<SMTPTestResponse> {
  return apiRequest<SMTPTestResponse>('/ad/smtp-test', {
    method: 'POST',
    body: JSON.stringify({ recipient_email }),
  });
}
