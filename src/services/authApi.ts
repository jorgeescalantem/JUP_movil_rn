import { env } from '../config/env';
import { AuthLoginResponse } from '../types/api';

const REQUEST_TIMEOUT_MS = 10000;

export type ApiConnectionResult =
  | { ok: true; data: AuthLoginResponse }
  | { ok: false; message: string };

/**
 * Performs a login call against the real API using the fixed system credentials.
 * This is used purely to validate that the app can reach the backend before
 * showing the main login screen to the end user.
 */
export async function checkApiConnection(): Promise<ApiConnectionResult> {
  if (!env.apiBaseUrl || !env.apiAuthUser || !env.apiAuthPwd) {
    return {
      ok: false,
      message: 'La configuracion de conexion no esta completa. Contacta al administrador.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user: env.apiAuthUser, pwd: env.apiAuthPwd }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `No se pudo establecer conexion con el servidor (codigo ${response.status}).`,
      };
    }

    const data = (await response.json()) as AuthLoginResponse;

    if (!data?.token) {
      return { ok: false, message: 'La respuesta del servidor no fue valida.' };
    }

    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo establecer conexion con el servidor. Verifica tu conexion a internet.' };
  } finally {
    clearTimeout(timeoutId);
  }
}
