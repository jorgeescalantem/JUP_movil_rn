import { env } from '../config/env';
import { ODataListResponse, TbvehiculoRecord, TcconductorRecord, TusuarioMobilRecord } from '../types/api';
import { OwnedVehicle, RoleCapability } from '../types/domain';
import { fetchWithTimeout, getJupwebCoToken } from './jupwebCoAuth';

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
 * TEMPORARY DEV DIAGNOSTIC (not used in any real flow): logs real
 * Tcconductores.Id candidates with Tipo PROPIETARIO/AMBOS plus their
 * TusuarioMobil.Username, so a real owner account can be picked for testing.
 * Safe/best-effort - never throws, never blocks login.
 */
export async function debugFindPropietarioCandidates(): Promise<void> {
  const coToken = await getJupwebCoToken();
  if (!coToken) {
    console.log('[debugFindPropietarioCandidates] no jupweb.co token');
    return;
  }

  const conductoresQuery = new URLSearchParams({
    $top: '10',
    $filter: `Tipo eq 'PROPIETARIO' or Tipo eq 'AMBOS'`,
    $select: 'Id,Tipo',
  });

  const conductoresResponse = await fetchWithTimeout(
    `${env.preopBaseUrl}/oData/Tcconductores?${conductoresQuery.toString()}`,
    { method: 'GET', headers: { Authorization: `Bearer ${coToken}`, Accept: 'application/json' } },
  );

  if (!conductoresResponse.ok) {
    console.log('[debugFindPropietarioCandidates] Tcconductores query failed', conductoresResponse.status);
    return;
  }

  const conductoresPayload = (await conductoresResponse.json()) as ODataListResponse<TcconductorRecord>;
  console.log('[debugFindPropietarioCandidates] candidates', conductoresPayload.value);

  const ids = conductoresPayload.value.map((c) => c.Id);
  if (ids.length === 0) {
    return;
  }

  const mobilToken = await getMobilToken();
  if (!mobilToken) {
    console.log('[debugFindPropietarioCandidates] no mobil token');
    return;
  }

  const usuariosQuery = new URLSearchParams({
    $top: '20',
    $filter: `Conductor in (${ids.join(',')})`,
    $select: 'Username,Conductor,Nodoc,Activa,Estado',
  });

  const usuariosResponse = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil?${usuariosQuery.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${mobilToken}`, Accept: 'application/json' },
  });

  if (!usuariosResponse.ok) {
    console.log('[debugFindPropietarioCandidates] TusuarioMobil query failed', usuariosResponse.status);
    return;
  }

  const usuariosPayload = (await usuariosResponse.json()) as ODataListResponse<TusuarioMobilRecord>;
  console.log('[debugFindPropietarioCandidates] mobil users', usuariosPayload.value);
}

export type RoleFetchResult =
  | { ok: true; roleCapability: RoleCapability }
  | { ok: false };

export type OwnedVehiclesFetchResult =
  | { ok: true; vehicles: OwnedVehicle[] }
  | { ok: false };

function toRoleCapability(tipo: string | undefined): RoleCapability {
  const normalized = (tipo ?? '').trim().toUpperCase();
  return normalized === 'PROPIETARIO' || normalized === 'AMBOS' ? normalized : 'CONDUCTOR';
}

/**
 * Resolves the real role capability for a driver/owner via Tcconductores.Tipo,
 * looked up by the Tcconductores.Id stored in TusuarioMobil.Conductor.
 * Best-effort: callers should fall back to CONDUCTOR when this returns `ok: false`.
 */
export async function fetchConductorRole(conductorId: number): Promise<RoleFetchResult> {
  console.log('[fetchConductorRole] start', { conductorId });
  const token = await getJupwebCoToken();

  if (!token) {
    console.log('[fetchConductorRole] no token');
    return { ok: false };
  }

  try {
    const query = new URLSearchParams({ $select: 'Id,Tipo' });
    const response = await fetchWithTimeout(
      `${env.preopBaseUrl}/oData/Tcconductores(${conductorId})?${query.toString()}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );

    console.log('[fetchConductorRole] response status', response.status);

    if (!response.ok) {
      return { ok: false };
    }

    const record = (await response.json()) as TcconductorRecord;
    console.log('[fetchConductorRole] record', record);
    return { ok: true, roleCapability: toRoleCapability(record.Tipo) };
  } catch (error) {
    console.log('[fetchConductorRole] error', error);
    return { ok: false };
  }
}

/**
 * Fetches the active vehicles (Estado eq 1) a PROPIETARIO/AMBOS user is the
 * Locatario of, used to group information by plate.
 */
export async function fetchOwnedVehicles(conductorId: number): Promise<OwnedVehiclesFetchResult> {
  console.log('[fetchOwnedVehicles] start', { conductorId });
  const token = await getJupwebCoToken();

  if (!token) {
    console.log('[fetchOwnedVehicles] no token');
    return { ok: false };
  }

  try {
    const query = new URLSearchParams({
      $top: '100',
      $filter: `Locatario eq ${conductorId} and Estado eq 1`,
      $select: 'Codvehiculo,Placa',
    });
    console.log('[fetchOwnedVehicles] query', query.toString());

    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tbvehiculos?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    console.log('[fetchOwnedVehicles] response status', response.status);

    if (!response.ok) {
      return { ok: false };
    }

    const payload = (await response.json()) as ODataListResponse<TbvehiculoRecord>;
    console.log('[fetchOwnedVehicles] payload', payload.value);
    return {
      ok: true,
      vehicles: payload.value.map((record) => ({ codvehiculo: record.Codvehiculo, placa: (record.Placa ?? '').trim() })),
    };
  } catch (error) {
    console.log('[fetchOwnedVehicles] error', error);
    return { ok: false };
  }
}
