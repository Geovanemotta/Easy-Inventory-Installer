import { LoginResponse, User, Verify2FAResponse } from '@/types/auth';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:8000/api/v1'
    : '/api/v1');

const TOKEN_KEY = 'giassi_token';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Cliente HTTP base fortemente tipado com injeção automática de JWT
 * e tratamento padronizado de erros.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      authStorage.removeToken();
    }

    let errorMessage = `Erro HTTP ${response.status}`;
    let errorData: unknown = null;

    try {
      errorData = await response.json();
      if (typeof errorData === 'object' && errorData !== null && 'detail' in errorData) {
        errorMessage = String((errorData as { detail: unknown }).detail);
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Retorna vazio caso o status seja 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// =====================================================================
// Funções de Autenticação
// =====================================================================

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (data.access_token) {
    authStorage.setToken(data.access_token);
  }

  return data;
}

export async function verify2FA(tempToken: string, code: string): Promise<Verify2FAResponse> {
  const data = await apiRequest<Verify2FAResponse>('/auth/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ temp_token: tempToken, code }),
  });

  if (data.access_token) {
    authStorage.setToken(data.access_token);
  }

  return data;
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

export function logout(): void {
  authStorage.removeToken();
}
