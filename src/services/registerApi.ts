import { env } from '../config/env';
import { ODataListResponse, TbvehiculoRecord, TcconductorRecord, TusuarioMobilRecord } from '../types/api';

const REQUEST_TIMEOUT_MS = 10000;

type ExtendedTcconductorRecord = TcconductorRecord & {
  Condnumerodoc: string | null;
  Condnombres: string | null;
  Condemail: string | null;
  Estado: number;
  VehiculoActivo: number | null;
};

export type FindConductorResult =
  | { ok: true; conductor: ExtendedTcconductorRecord }
  | { ok: false; message: string };

export type RegisterResult = { ok: true } | { ok: false; message: string };

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

function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function getMobilToken(): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`${env.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
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
 * Looks up an ACTIVE Tcconductores record by document number. Rejects (rather
 * than picking one) when the document matches more than one active record,
 * since some documents (mostly company NITs) are duplicated in the table.
 */
export async function findConductorByDocument(documentNumber: string): Promise<FindConductorResult> {
  const nodoc = documentNumber.trim();

  if (!nodoc) {
    return { ok: false, message: 'Ingresa el numero de documento.' };
  }

  const token = await getMobilToken();

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor.' };
  }

  try {
    const query = new URLSearchParams({
      $top: '2',
      $count: 'true',
      $filter: `Condnumerodoc eq '${escapeODataStringLiteral(nodoc)}' and Estado eq 1`,
      $select: 'Id,Tipo,Condnumerodoc,Condnombres,Condemail,Estado,VehiculoActivo',
    });

    const response = await fetchWithTimeout(`${env.apiODataUrl}/Tcconductores?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { ok: false, message: 'No se pudo validar el documento. Intenta nuevamente.' };
    }

    const payload = (await response.json()) as ODataListResponse<ExtendedTcconductorRecord>;

    if (payload.value.length === 0) {
      return { ok: false, message: 'No encontramos un conductor o propietario activo con ese numero de documento.' };
    }

    if (payload.value.length > 1) {
      return {
        ok: false,
        message: 'Este documento tiene mas de un registro activo. Contacta al administrador para continuar.',
      };
    }

    return { ok: true, conductor: payload.value[0] };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo validar el documento. Intenta nuevamente.' };
  }
}

async function hasMobilAccount(conductorId: number, token: string): Promise<boolean> {
  const query = new URLSearchParams({ $top: '1', $count: 'true', $filter: `Conductor eq ${conductorId}` });

  const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ODATA_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as ODataListResponse<TusuarioMobilRecord>;
  return payload.value.length > 0;
}

async function isUsernameTaken(username: string, token: string): Promise<boolean> {
  const query = new URLSearchParams({
    $top: '1',
    $count: 'true',
    $filter: `Username eq '${escapeODataStringLiteral(username)}'`,
  });

  const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ODATA_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as ODataListResponse<TusuarioMobilRecord>;
  return payload.value.length > 0;
}

async function fetchActiveVehiclePlaca(codvehiculo: number, token: string): Promise<{ vehiculo: number; placa: string }> {
  const query = new URLSearchParams({ $select: 'Codvehiculo,Placa' });

  try {
    const response = await fetchWithTimeout(`${env.apiODataUrl}/Tbvehiculos(${codvehiculo})?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { vehiculo: 0, placa: '' };
    }

    const record = (await response.json()) as TbvehiculoRecord;
    return { vehiculo: record.Codvehiculo, placa: (record.Placa ?? '').trim() };
  } catch {
    return { vehiculo: 0, placa: '' };
  }
}

/**
 * Creates a TusuarioMobil account for a person already present in
 * Tcconductores (driver or owner). MobilKey starts empty ('') and gets bound
 * to a device on first login, same as the existing login flow.
 */
export async function registerMobilUser(params: {
  conductor: ExtendedTcconductorRecord;
  username: string;
  password: string;
}): Promise<RegisterResult> {
  const username = params.username.trim();
  const password = params.password.trim();

  if (!username || !password) {
    return { ok: false, message: 'Ingresa usuario y contrasena.' };
  }

  const token = await getMobilToken();

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor.' };
  }

  try {
    const [alreadyRegistered, usernameTaken] = await Promise.all([
      hasMobilAccount(params.conductor.Id, token),
      isUsernameTaken(username, token),
    ]);

    if (alreadyRegistered) {
      return { ok: false, message: 'Ya existe una cuenta activa de este usuario.' };
    }

    if (usernameTaken) {
      return { ok: false, message: 'Ese nombre de usuario ya esta en uso. Elige otro.' };
    }

    const { vehiculo, placa } = params.conductor.VehiculoActivo
      ? await fetchActiveVehiclePlaca(params.conductor.VehiculoActivo, token)
      : { vehiculo: 0, placa: '' };

    // Colombia local time (UTC-05:00, no DST); explicit offset avoids UTC misparsing.
    const registro = `${new Date().toISOString().slice(0, 19)}-05:00`;

    const response = await fetchWithTimeout(`${env.apiODataUrl}/TusuarioMobil`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Contrasena: password,
        MobilKey: '',
        Conductor: params.conductor.Id,
        Activa: true,
        Email: (params.conductor.Condemail ?? '').trim(),
        Registro: registro,
        Nodoc: (params.conductor.Condnumerodoc ?? '').trim(),
        Estado: false,
        Username: username,
        Placa: placa,
        Vehiculo: vehiculo,
        Nombre: (params.conductor.Condnombres ?? '').trim(),
        OcultarTarifa: false,
      }),
    });

    if (!response.ok) {
      return { ok: false, message: 'No se pudo crear la cuenta. Intenta nuevamente.' };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo crear la cuenta. Intenta nuevamente.' };
  }
}
