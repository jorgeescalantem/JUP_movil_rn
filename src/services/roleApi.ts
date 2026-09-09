import { env } from '../config/env';
import { ODataListResponse, TbvehiculoRecord, TcconductorRecord } from '../types/api';
import { OwnedVehicle, RoleCapability } from '../types/domain';
import { fetchWithTimeout, getJupwebCoToken } from './jupwebCoAuth';

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
  const token = await getJupwebCoToken();

  if (!token) {
    return { ok: false };
  }

  try {
    const query = new URLSearchParams({ $select: 'Id,Tipo' });
    const response = await fetchWithTimeout(
      `${env.preopBaseUrl}/oData/Tcconductores(${conductorId})?${query.toString()}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );

    if (!response.ok) {
      return { ok: false };
    }

    const record = (await response.json()) as TcconductorRecord;
    return { ok: true, roleCapability: toRoleCapability(record.Tipo) };
  } catch {
    return { ok: false };
  }
}

/**
 * Fetches the active vehicles (Estado eq 1) a PROPIETARIO/AMBOS user is the
 * Locatario of, used to group information by plate.
 */
export async function fetchOwnedVehicles(conductorId: number): Promise<OwnedVehiclesFetchResult> {
  const token = await getJupwebCoToken();

  if (!token) {
    return { ok: false };
  }

  try {
    const query = new URLSearchParams({
      $top: '100',
      $filter: `Locatario eq ${conductorId} and Estado eq 1`,
      $select: 'Codvehiculo,Placa',
    });

    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tbvehiculos?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { ok: false };
    }

    const payload = (await response.json()) as ODataListResponse<TbvehiculoRecord>;
    return {
      ok: true,
      vehicles: payload.value.map((record) => ({ codvehiculo: record.Codvehiculo, placa: (record.Placa ?? '').trim() })),
    };
  } catch {
    return { ok: false };
  }
}
