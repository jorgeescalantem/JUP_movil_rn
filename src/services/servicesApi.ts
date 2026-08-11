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
    return [];
  }

  const query = new URLSearchParams({ $top: String(Math.min(uniqueIds.length, 100)), $filter: `Id in (${uniqueIds.join(',')})` });

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/${entity}?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ODataListResponse<T>;
    return payload.value;
  } catch {
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
): Service {
  const cliente = clientesById.get(record.Cliente);
  const { nombre, documento } = buildCliente(cliente);
  const convenio = cliente?.Idconvenio != null ? conveniosById.get(cliente.Idconvenio) : undefined;
  const empresa = convenio ? empresasById.get(convenio.Empresa) : undefined;

  return {
    numeroServicio: String(record.Codservicio),
    orden: record.Orden,
    contrato: (cliente?.Contrato ?? '').trim(),
    estado: 'ASIGNADA',
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
  const token = await getJupwebCoToken();

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor de servicios.' };
  }

  const query = new URLSearchParams({
    $top: '100',
    $count: 'true',
    $filter: `UnidadAsignada eq ${vehiculoCodigo} and Estservicio eq 1`,
  });

  let records: TbservicioRawRecord[];

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tbservicios?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { ok: false, message: 'No se pudo cargar la lista de servicios.' };
    }

    const payload = (await response.json()) as ODataListResponse<TbservicioRawRecord>;
    records = payload.value;
  } catch (error) {
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

  return {
    ok: true,
    services: records.map((record) => mapToService(record, clientesById, conveniosById, empresasById)),
  };
}

