import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type RecoverPasswordResult = { ok: true } | { ok: false; message: string };

/**
 * Recupera el acceso de una cuenta existente - via jup-api (verifica
 * documento+correo y envia la contrasena temporal por EmailJS server-side;
 * las llaves de EmailJS ya no viven en el bundle de la app).
 */
export async function recoverPassword(documentNumber: string, email: string): Promise<RecoverPasswordResult> {
  try {
    const response = await jupApiFetch('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ documentNumber, email }),
    });

    const data = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      return { ok: false, message: data?.message ?? 'No fue posible recuperar la contrasena.' };
    }

    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No fue posible recuperar la contrasena.' };
  }
}
