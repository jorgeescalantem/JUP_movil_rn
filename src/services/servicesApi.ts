import { env } from '../config/env';
import {
  ODataListResponse,
  TbclienteRecord,
  TbservicioRawRecord,
  TpconvenioRecord,
  TpempresaRecord,
} from '../types/api';
import { Service } from '../types/domain';
import { fetchWithTimeout, getJupwebCoToken } from './jupwebCoAuth';

export type ServicesFetchResult =
  | { ok: true; services: Service[] }
  | { ok: false; message: string };

async function fetchByIds<T>(entity: string, ids: (number | null | undefined)[], token: string): Promise<T[]> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))));

  if (uniqueIds.length === 0) {
    console.log(`[fetchByIds] ${entity}`, { uniqueIds: [] });
    return [];
  }

  const query = new URLSearchParams({ $top: String(Math.min(uniqueIds.length, 100)), $filter: `Id in (${uniqueIds.join(',')})` });

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/${entity}?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      console.log(`[fetchByIds] ${entity} failed`, { status: response.status, uniqueIds });
      return [];
    }

    const payload = (await response.json()) as ODataListResponse<T>;
    console.log(`[fetchByIds] ${entity} ok`, { uniqueIds, count: payload.value.length });
    return payload.value;
  } catch (error) {
    console.log(`[fetchByIds] ${entity} error`, error);
    return [];
  }
}

// Reproduces the view's "APELLIDOS NOMBRES, (TIPODOC NODOC)" NomCliente format,
// already split into name/document since that's what the Service type expects.
function buildCliente(cliente: TbclienteRecord | undefined): { nombre: string; documento: string } {
  if (!cliente) {
    return { nombre: '', documento: '' };
  }

  const nombre = [cliente.Apellido1, cliente.Apellido2, cliente.Nombre1, cliente.Nombre2]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
    .join(' ');

  return { nombre, documento: (cliente.Nodoc ?? '').trim() };
}

function buildTelefonos(cliente: TbclienteRecord | undefined): string[] {
  if (!cliente) {
    return [];
  }

  return [cliente.Celular1, cliente.Celular2, cliente.Telefono]
    .map((phone) => (phone ?? '').trim())
    .filter((phone) => phone.length > 0);
}

function parseCoordinate(value: string | null | undefined): number {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapToService(
  record: TbservicioRawRecord,
  clientesById: Map<number, TbclienteRecord>,
  conveniosById: Map<number, TpconvenioRecord>,
  empresasById: Map<number, TpempresaRecord>,
  estado: Service['estado'] = 'ASIGNADA',
): Service {
  const cliente = clientesById.get(record.Cliente);
  const { nombre, documento } = buildCliente(cliente);
  const convenio = cliente?.Idconvenio != null ? conveniosById.get(cliente.Idconvenio) : undefined;
  const empresa = convenio ? empresasById.get(convenio.Empresa) : undefined;

  return {
    numeroServicio: String(record.Codservicio),
    orden: record.Orden,
    contrato: (cliente?.Contrato ?? '').trim(),
    estado,
    // Fecha/Hrecogida are Colombia local time (UTC-05:00, no DST); the explicit
    // offset avoids Date() misparsing this as UTC and shifting the hour on display.
    fechaServicio: `${record.Fecha}T${record.Hrecogida || '00:00'}:00-05:00`,
    HoraRecogida: record.Hrecogida ?? '',
    HoraCita: record.Hllegada ?? '',
    origenDireccion: record.Dircli1 ?? '',
    origenLat: parseCoordinate(record.Lat1),
    origenLng: parseCoordinate(record.Lng1),
    destinoDireccion: record.Dircli2 ?? '',
    destinoLat: parseCoordinate(record.Lat2),
    destinoLng: parseCoordinate(record.Lng2),
    clienteNombre: nombre,
    clienteDocumento: documento,
    companiaNombre: empresa?.Nombre ?? '',
    zona: record.Zonaservicio || record.Localidadinicio || '',
    telefonos: buildTelefonos(cliente),
    Guiacontrol: record.Guia || null,
    valor: record.Valtraslado ?? 0,
    copago: record.Copago ?? 0,
  };
}

/**
 * Fetches services currently assigned (Estservicio = 1) to the given vehicle
 * from the raw Tbservicios table (Tbserviciosview was found to be missing
 * live records) and reconstructs the client/company data the view used to
 * provide via Tbclientes -> Tpconvenios -> Tpempresas joins.
 */
export async function fetchAssignedServices(vehiculoCodigo: number): Promise<ServicesFetchResult> {
  console.log('[fetchAssignedServices] start', { vehiculoCodigo });
  const token = await getJupwebCoToken();
  console.log('[fetchAssignedServices] token', { hasToken: !!token });

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor de servicios.' };
  }

  const query = new URLSearchParams({
    $top: '100',
    $count: 'true',
    $filter: `UnidadAsignada eq ${vehiculoCodigo} and Estservicio eq 1`,
  });
  console.log('[fetchAssignedServices] query', query.toString());

  let records: TbservicioRawRecord[];

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tbservicios?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    console.log('[fetchAssignedServices] response status', response.status);

    if (!response.ok) {
      return { ok: false, message: 'No se pudo cargar la lista de servicios.' };
    }

    const payload = (await response.json()) as ODataListResponse<TbservicioRawRecord>;
    records = payload.value;
    console.log('[fetchAssignedServices] records', {
      count: records.length,
      codservicios: records.map((r) => r.Codservicio),
    });
  } catch (error) {
    console.log('[fetchAssignedServices] error', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado al cargar los servicios.' };
    }

    return { ok: false, message: 'No se pudo cargar la lista de servicios.' };
  }

  if (records.length === 0) {
    return { ok: true, services: [] };
  }

  const clientes = await fetchByIds<TbclienteRecord>('Tbclientes', records.map((r) => r.Cliente), token);
  const clientesById = new Map(clientes.map((c) => [c.Id, c]));

  const convenios = await fetchByIds<TpconvenioRecord>('Tpconvenios', clientes.map((c) => c.Idconvenio), token);
  const conveniosById = new Map(convenios.map((c) => [c.Id, c]));

  const empresas = await fetchByIds<TpempresaRecord>('Tpempresas', convenios.map((c) => c.Empresa), token);
  const empresasById = new Map(empresas.map((e) => [e.Id, e]));

  console.log('[fetchAssignedServices] joins', {
    clientes: clientes.length,
    convenios: convenios.length,
    empresas: empresas.length,
  });

  const services = records.map((record) => mapToService(record, clientesById, conveniosById, empresasById));
  console.log('[fetchAssignedServices] mapped services', {
    count: services.length,
    numerosServicio: services.map((s) => s.numeroServicio),
  });

  return {
    ok: true,
    services,
  };
}

/**
 * Fetches a vehicle's service history from Tbservicios within a date range,
 * filtered by the `Fecha` field. Only server-side filters by vehicle (the
 * date range is applied client-side using the same lexicographic-safe ISO
 * "YYYY-MM-DD" string comparison already used elsewhere in this app), since
 * this backend's exact date-literal OData syntax isn't confirmed. Historical
 * rows are reported as COMPLETADO - Tbservicios doesn't otherwise expose a
 * reliable in-transit/terminado distinction for a non-driving owner.
 */
export async function fetchVehicleServiceHistory(
  vehiculoCodigo: number,
  fromDate: string,
  toDate: string,
): Promise<ServicesFetchResult> {
  console.log('[fetchVehicleServiceHistory] start', { vehiculoCodigo, fromDate, toDate });
  const token = await getJupwebCoToken();

  if (!token) {
    console.log('[fetchVehicleServiceHistory] no token');
    return { ok: false, message: 'No se pudo establecer conexion con el servidor de servicios.' };
  }

  // `$orderby=Fecha desc` (and/or $top>100) triggered a 400 from this OData
  // backend - Codservicio (the primary key, virtually always orderable) is
  // used instead as a recency proxy, since Codservicio grows over time.
  // 100 is the highest $top confirmed NOT to 400 (300 also failed) - the
  // 30-day range cap (see MAX_RANGE_DAYS) keeps this from truncating in practice.
  const query = new URLSearchParams({
    $top: '100',
    $orderby: 'Codservicio desc',
    $filter: `UnidadAsignada eq ${vehiculoCodigo}`,
  });

  let records: TbservicioRawRecord[];

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tbservicios?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    console.log('[fetchVehicleServiceHistory] response status', response.status);

    if (!response.ok) {
      return { ok: false, message: 'No se pudo cargar el historico de servicios.' };
    }

    const payload = (await response.json()) as ODataListResponse<TbservicioRawRecord>;
    console.log('[fetchVehicleServiceHistory] raw records', {
      total: payload.value.length,
      fechas: payload.value.map((r) => r.Fecha),
    });
    if (payload.value.length >= 100) {
      // Hitting the $top cap means older rows within [fromDate, toDate] may
      // have been cut off - the vehicle has more history than one page covers.
      console.log('[fetchVehicleServiceHistory] WARNING: hit $top cap, range may be truncated');
    }
    records = payload.value
      .filter((r) => r.Fecha >= fromDate && r.Fecha <= toDate)
      .sort((a, b) => (a.Fecha < b.Fecha ? 1 : a.Fecha > b.Fecha ? -1 : 0));
    console.log('[fetchVehicleServiceHistory] after date filter', { count: records.length });
  } catch (error) {
    console.log('[fetchVehicleServiceHistory] error', error);
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado al cargar el historico.' };
    }

    return { ok: false, message: 'No se pudo cargar el historico de servicios.' };
  }

  if (records.length === 0) {
    return { ok: true, services: [] };
  }

  const clientes = await fetchByIds<TbclienteRecord>('Tbclientes', records.map((r) => r.Cliente), token);
  const clientesById = new Map(clientes.map((c) => [c.Id, c]));

  const convenios = await fetchByIds<TpconvenioRecord>('Tpconvenios', clientes.map((c) => c.Idconvenio), token);
  const conveniosById = new Map(convenios.map((c) => [c.Id, c]));

  const empresas = await fetchByIds<TpempresaRecord>('Tpempresas', convenios.map((c) => c.Empresa), token);
  const empresasById = new Map(empresas.map((e) => [e.Id, e]));

  const services = records.map((record) => mapToService(record, clientesById, conveniosById, empresasById, 'COMPLETADO'));
  console.log('[fetchVehicleServiceHistory] mapped services', {
    count: services.length,
    numerosServicio: services.map((s) => s.numeroServicio),
  });

  return {
    ok: true,
    services,
  };
}

