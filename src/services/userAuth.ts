import { SanitizedMobilUser } from '../types/api';
import { OwnedVehicle, RoleCapability } from '../types/domain';
import { getShortDeviceId } from '../utils/deviceId';
import { setJupApiToken } from './apiSessionStore';
import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type MobilLoginResult =
  | { ok: true; user: SanitizedMobilUser; roleCapability: RoleCapability; ownedVehicles: OwnedVehicle[] }
  | { ok: false; message: string };

/**
 * Authenticates a driver/owner against jup-api (which validates Username +
 * Contrasena against the real TusuarioMobil table, rejects disabled accounts,
 * and enforces one active session per device via MobilKey - all server-side
 * now, so the client never sees Contrasena). jup-api also resolves
 * roleCapability/ownedVehicles server-side (direct DB access) in the same
 * call, so the client never needs its own credentials against jupweb.co.
 * Stores the returned JWT for every subsequent jup-api call.
 */
export async function loginMobilUser(rawUsername: string, rawPassword: string): Promise<MobilLoginResult> {
  const username = rawUsername.trim();
  const password = rawPassword.trim();

  if (!username || !password) {
    return { ok: false, message: 'Debes ingresar usuario y contrasena.' };
  }

  const deviceId = await getShortDeviceId();

  try {
    const response = await jupApiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, deviceId }),
    });

    const data = (await response.json()) as {
      message?: string;
      token?: string;
      user?: SanitizedMobilUser;
      roleCapability?: RoleCapability;
      ownedVehicles?: OwnedVehicle[];
    };

    if (!response.ok || !data.token || !data.user) {
      return { ok: false, message: data.message ?? 'Usuario o contrasena invalido.' };
    }

    setJupApiToken(data.token);
    return {
      ok: true,
      user: data.user,
      roleCapability: data.roleCapability ?? 'CONDUCTOR',
      ownedVehicles: data.ownedVehicles ?? [],
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo validar el usuario. Intenta nuevamente.' };
  }
}

/**
 * Releases the device lock (e.g. on logout) so the account can start a new
 * session from another device afterwards. Best-effort/fire-and-forget.
 */
export async function releaseMobilKey(_mobilUserId: number): Promise<void> {
  try {
    await jupApiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // best-effort: logout must not be blocked by a network failure.
  } finally {
    setJupApiToken(null);
  }
}
