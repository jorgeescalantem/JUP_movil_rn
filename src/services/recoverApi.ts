import { env } from '../config/env';
import { ODataListResponse, TusuarioMobilRecord } from '../types/api';

const REQUEST_TIMEOUT_MS = 10000;
const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

export type RecoverPasswordResult = { ok: true } | { ok: false; message: string };

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function escapeODataStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function getMobilToken(): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`${env.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ user: env.apiAuthUser, pwd: env.apiAuthPwd }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Short, human-typeable temporary password. Avoids visually ambiguous
 * characters (0/O, 1/l/I) since the user has to read it from an email and
 * type it back into the login screen.
 */
function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';

  for (let i = 0; i < 8; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return result;
}

/**
 * Finds the ACTIVE TusuarioMobil account matching both the document number
 * and its registered email (case/whitespace-insensitive). Requiring both
 * fields to match is the only verification available without a real
 * email/SMS challenge, so a document number alone is not enough.
 */
async function findAccount(nodoc: string, email: string, token: string): Promise<TusuarioMobilRecord | null> {
  const query = new URLSearchParams({
    $top: '5',
    $filter: `Nodoc eq '${escapeODataStringLiteral(nodoc)}' and Activa eq true`,
  });

  const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ODATA_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as ODataListResponse<TusuarioMobilRecord>;
  const normalizedEmail = email.trim().toLowerCase();
  const matches = payload.value.filter((record) => (record.Email ?? '').trim().toLowerCase() === normalizedEmail);

  return matches.length === 1 ? matches[0] : null;
}

async function sendRecoveryEmail(params: {
  toEmail: string;
  documento: string;
  contrasena: string;
  usuario: string;
}): Promise<boolean> {
  if (!env.emailjsServiceId || !env.emailjsTemplateId || !env.emailjsPublicKey || !env.emailjsPrivateKey) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(EMAILJS_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        service_id: env.emailjsServiceId,
        template_id: env.emailjsTemplateId,
        user_id: env.emailjsPublicKey,
        accessToken: env.emailjsPrivateKey,
        template_params: {
          to_email: params.toEmail,
          documento: params.documento,
          contrasena: params.contrasena,
          usuario: params.usuario,
        },
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sends the email FIRST and only updates the account (new password + MobilKey
 * release) once delivery succeeds, so a failed send never leaves the account
 * with a changed password the user was never told about.
 */
async function applyNewPassword(id: number, newPassword: string, token: string): Promise<boolean> {
  const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil(${id})`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Contrasena: newPassword, MobilKey: '' }),
  });

  return response.ok;
}

/**
 * Recovers access for an existing driver/owner account: verifies document +
 * email against TusuarioMobil, emails a new temporary password via EmailJS,
 * and releases the device lock (MobilKey) so they can log in from any device.
 */
export async function recoverPassword(documentNumber: string, email: string): Promise<RecoverPasswordResult> {
  const nodoc = documentNumber.trim();
  const correo = email.trim();

  if (!nodoc || !correo) {
    return { ok: false, message: 'Ingresa el numero de documento y el correo asociado.' };
  }

  const token = await getMobilToken();

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor.' };
  }

  try {
    const account = await findAccount(nodoc, correo, token);

    if (!account) {
      return { ok: false, message: 'No encontramos una cuenta activa con ese documento y correo.' };
    }

    const newPassword = generateTemporaryPassword();

    const emailSent = await sendRecoveryEmail({
      toEmail: account.Email ?? correo,
      documento: nodoc,
      contrasena: newPassword,
      usuario: account.Username,
    });

    if (!emailSent) {
      return { ok: false, message: 'No se pudo enviar el correo de recuperacion. Intenta nuevamente.' };
    }

    const updated = await applyNewPassword(account.Id, newPassword, token);

    if (!updated) {
      return {
        ok: false,
        message: 'El correo se envio pero no se pudo actualizar la cuenta. Intenta nuevamente.',
      };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo procesar la solicitud. Intenta nuevamente.' };
  }
}
