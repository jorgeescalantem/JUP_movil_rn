import { env } from '../config/env';
import { getJupApiToken } from './apiSessionStore';

const REQUEST_TIMEOUT_MS = 10000;

/**
 * Shared fetch wrapper for every call to our own backend (jup-api). Attaches
 * the JWT from apiSessionStore automatically when present, so individual
 * service functions never have to handle the Authorization header themselves.
 */
export async function jupApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getJupApiToken();

  try {
    return await fetch(`${env.jupApiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** True when the request was aborted by our own timeout above. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
