import { env } from '../config/env';
import { ODataListResponse, TbFirmaPayload, TcconductorRecord } from '../types/api';
import { fetchWithTimeout } from './jupwebCoAuth';

export type SaveFirmaResult = { ok: true } | { ok: false; message: string };

function escapeODataStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Fetches a FRESH system token for this request instead of reusing the one
 * cached by ConnectivityGate at app startup: that token is short-lived
 * (~30 min) and a driver typically signs well after that window (drive to
 * origin, then destination, then delivery), so the cached token is often
 * already expired by the time saveFirma runs, causing a silent 401 here.
 */
async function getFreshMobilToken(): Promise<string | null> {
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

// react-native-signature-canvas returns a "data:image/png;base64,..." URL;
// TbFirmas.Firma (Edm.Binary) expects the raw base64 payload without the prefix.
export function toRawBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

// Builds an unambiguous Colombia local timestamp (UTC-05:00, no DST) for
// Fechaserviciofirma/Horaserviciofirma, same fix applied to fechaServicio.
export function nowInColombiaIso(): string {
  const now = new Date();
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');

  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}-05:00`
  );
}

/** Looks up the real Tcconductores.Id for the logged-in user's document number. */
async function findConductorIdByDocument(nodoc: string, token: string): Promise<number | null> {
  try {
    const query = new URLSearchParams({
      $top: '1',
      $filter: `Condnumerodoc eq '${escapeODataStringLiteral(nodoc)}'`,
      $select: 'Id',
    });

    const response = await fetchWithTimeout(`${env.apiODataUrl}/Tcconductores?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ODataListResponse<TcconductorRecord>;
    return payload.value[0]?.Id ?? null;
  } catch {
    return null;
  }
}

/** Persists a signature captured in the app against its service/order. */
export async function saveFirma(payload: TbFirmaPayload, documentoConductor: string): Promise<SaveFirmaResult> {
  try {
    const token = await getFreshMobilToken();

    if (!token) {
      return { ok: false, message: 'No se pudo establecer conexion con el servidor.' };
    }

    // Re-resolve the conductor tied to this plate/document instead of trusting
    // whatever Conductor id the caller had cached, in case it's stale/wrong.
    const resolvedConductorId = await findConductorIdByDocument(documentoConductor, token);

    // TB_FIRMAS.PLACA is only 6 chars wide in the real DB (metadata claims
    // unbounded Edm.String) - anything longer causes a hard "String or binary
    // data would be truncated" 400, verified live. Sanitize defensively since
    // some TusuarioMobil.Placa values carry stray whitespace/length issues.
    const sanitizedPayload = {
      ...payload,
      Placa: (payload.Placa ?? '').trim().slice(0, 6),
      Conductor: resolvedConductorId ?? payload.Conductor,
    };

    const response = await fetchWithTimeout(`${env.apiODataUrl}/TbFirmas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(sanitizedPayload),
    });

    if (!response.ok) {
      return { ok: false, message: 'No se pudo guardar la firma.' };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado al guardar la firma.' };
    }

    return { ok: false, message: 'No se pudo guardar la firma.' };
  }
}

