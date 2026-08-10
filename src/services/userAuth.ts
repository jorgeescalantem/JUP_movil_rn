import { env } from '../config/env';
import { ODataListResponse, SanitizedMobilUser, TusuarioMobilRecord } from '../types/api';
import { getDeviceId } from '../utils/deviceId';
import { getSystemToken } from './apiSessionStore';

const REQUEST_TIMEOUT_MS = 10000;

export type MobilLoginResult =
  | { ok: true; user: SanitizedMobilUser }
  | { ok: false; message: string };

function authHeaders(): Record<string, string> {
  const token = getSystemToken();

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
  // OData string literals are single-quoted; escape embedded quotes by doubling them.
  return value.replace(/'/g, "''");
}

/**
 * Fetches a single TusuarioMobil record by Username, filtering server-side
 * with OData `$filter`. We deliberately avoid downloading the unfiltered
 * listing (`$top=20`) for a login attempt: that would expose every
 * returned user's plaintext `Contrasena` to the client just to check one
 * account. Only the record for the username being authenticated is requested.
 */
async function fetchMobilUserByUsername(username: string): Promise<TusuarioMobilRecord | null> {
  const query = new URLSearchParams({
    $top: '1',
    $count: 'true',
    $filter: `Username eq '${escapeODataStringLiteral(username)}'`,
  });

  const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil?${query.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`ODATA_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as ODataListResponse<TusuarioMobilRecord>;
  return payload.value?.[0] ?? null;
}

/**
 * Binds (or releases, when `mobilKey` is '') the given device to a
 * TusuarioMobil record via an OData PATCH. Best-effort: callers decide
 * whether a failure here should block the login.
 * NOTE: MOBIL_KEY is a NOT NULL column in the real database, so an empty
 * string (not null) is the sentinel used for "no device bound".
 */
async function updateMobilKey(id: number, mobilKey: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil(${id})`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ MobilKey: mobilKey }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Strips sensitive fields before the record ever leaves this service layer.
 * The plaintext password must never be returned to UI/state layers, logged,
 * or persisted to disk.
 */
function sanitizeMobilUser(record: TusuarioMobilRecord): SanitizedMobilUser {
  const { Contrasena: _password, AndroidToken: _androidToken, ...sanitized } = record;
  return sanitized;
}

/**
 * Authenticates a driver/owner against the real TusuarioMobil table and
 * enforces a single active session per device:
 * - Validates Username + Contrasena match.
 * - Rejects disabled accounts (`Activa === false`).
 * - If the account has no MobilKey bound yet, binds it to this device.
 * - If the account is already bound to a different device, the login is
 *   rejected so only one device can be active at a time.
 */
export async function loginMobilUser(rawUsername: string, rawPassword: string): Promise<MobilLoginResult> {
  const username = rawUsername.trim();
  const password = rawPassword.trim();

  if (!username || !password) {
    return { ok: false, message: 'Debes ingresar usuario y contrasena.' };
  }

  let record: TusuarioMobilRecord | null;

  try {
    record = await fetchMobilUserByUsername(username);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo validar el usuario. Intenta nuevamente.' };
  }

  if (!record || record.Contrasena !== password) {
    return { ok: false, message: 'Usuario o contrasena invalido.' };
  }

  if (!record.Activa) {
    return { ok: false, message: 'El usuario no esta activo. Contacta al administrador.' };
  }

  const deviceId = await getDeviceId();
  const boundKey = record.MobilKey?.trim() || null;

  if (boundKey && boundKey !== deviceId) {
    return {
      ok: false,
      message: 'Esta cuenta ya tiene una sesion activa en otro dispositivo.',
    };
  }

  if (!boundKey) {
    const bound = await updateMobilKey(record.Id, deviceId);

    if (!bound) {
      return {
        ok: false,
        message: 'No se pudo asegurar la sesion en este dispositivo. Intenta nuevamente.',
      };
    }
  }

  return { ok: true, user: sanitizeMobilUser({ ...record, MobilKey: deviceId }) };
}

/**
 * Releases the device lock for a user (e.g. on logout) so the account can
 * start a new session from another device afterwards. Best-effort/fire-and-forget.
 */
export async function releaseMobilKey(id: number): Promise<void> {
  await updateMobilKey(id, '');
}
