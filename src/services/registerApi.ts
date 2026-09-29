import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type RegisterResult = { ok: true } | { ok: false; message: string };

/**
 * Crea la cuenta movil para un conductor/propietario ya existente en
 * Tcconductores - via jup-api (valida documento, duplicados y vehiculo
 * activo server-side; el cliente ya no necesita credenciales del sistema
 * legacy para consultar jupweb.co directamente).
 */
export async function registerAccount(params: {
  documentNumber: string;
  username: string;
  password: string;
}): Promise<RegisterResult> {
  try {
    const response = await jupApiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        documentNumber: params.documentNumber,
        username: params.username,
        password: params.password,
      }),
    });

    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      return { ok: false, message: data?.message ?? 'No fue posible crear la cuenta.' };
    }

    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No fue posible crear la cuenta.' };
  }
}
