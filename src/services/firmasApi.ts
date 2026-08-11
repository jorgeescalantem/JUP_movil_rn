import { env } from '../config/env';
import { TbFirmaPayload } from '../types/api';
import { getSystemToken } from './apiSessionStore';
import { fetchWithTimeout } from './jupwebCoAuth';

export type SaveFirmaResult = { ok: true } | { ok: false; message: string };

function authHeaders(): Record<string, string> {
  const token = getSystemToken();

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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

/** Persists a signature captured in the app against its service/order. */
export async function saveFirma(payload: TbFirmaPayload): Promise<SaveFirmaResult> {
  try {
    const response = await fetchWithTimeout(`${env.apiODataUrl}/TbFirmas`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
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
