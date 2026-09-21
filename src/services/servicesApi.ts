import { Service } from '../types/domain';
import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type ServicesFetchResult =
  | { ok: true; services: Service[] }
  | { ok: false; message: string };

async function parseServicesResponse(response: Response, fallbackMessage: string): Promise<ServicesFetchResult> {
  const data = (await response.json().catch(() => null)) as { services?: Service[]; message?: string } | null;

  if (!response.ok || !data?.services) {
    return { ok: false, message: data?.message ?? fallbackMessage };
  }

  return { ok: true, services: data.services };
}

/** Servicios actualmente asignados (en curso) al vehiculo - via jup-api (backend propio). */
export async function fetchAssignedServices(vehiculoCodigo: number): Promise<ServicesFetchResult> {
  try {
    const response = await jupApiFetch(`/services/assigned?vehiculo=${vehiculoCodigo}`);
    return await parseServicesResponse(response, 'No se pudo cargar la lista de servicios.');
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado al cargar los servicios.' };
    }

    return { ok: false, message: 'No se pudo cargar la lista de servicios.' };
  }
}

/**
 * Historico de servicios prestados de un vehiculo en un rango de fechas - via
 * jup-api, que resuelve el filtrado/paginacion/joins directamente en SQL
 * (ver jup-api/src/modules/services), reemplazando el workaround de
 * paginacion por Codservicio que se necesitaba contra el backend OData legado.
 */
export async function fetchVehicleServiceHistory(
  vehiculoCodigo: number,
  fromDate: string,
  toDate: string,
): Promise<ServicesFetchResult> {
  try {
    const query = new URLSearchParams({ vehiculo: String(vehiculoCodigo), from: fromDate, to: toDate });
    const response = await jupApiFetch(`/services/history?${query.toString()}`);
    return await parseServicesResponse(response, 'No se pudo cargar el historico de servicios.');
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado al cargar el historico.' };
    }

    return { ok: false, message: 'No se pudo cargar el historico de servicios.' };
  }
}

