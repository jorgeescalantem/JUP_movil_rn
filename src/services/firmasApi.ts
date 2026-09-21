import { TbFirmaPayload } from '../types/api';
import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type SaveFirmaResult = { ok: true } | { ok: false; message: string };

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

/**
 * Persists a signature captured in the app against its service/order - via
 * jup-api's /signatures (the conductor is resolved server-side from the JWT,
 * never trusted from the client, so `documentoConductor` is no longer needed).
 */
export async function saveFirma(payload: TbFirmaPayload, _documentoConductor: string): Promise<SaveFirmaResult> {
  try {
    const response = await jupApiFetch('/signatures', {
      method: 'POST',
      body: JSON.stringify({
        codservicio: payload.Codservicio,
        codorden: payload.Codorden,
        noorden: payload.Noorden,
        fechaServicioFirma: payload.Fechaserviciofirma.slice(0, 10),
        horaServicioFirma: payload.Horaserviciofirma,
        placa: payload.Placa,
        firma: payload.Firma,
        firmaguia: payload.Firmaguia,
        cordenadasFirma: payload.Cordenadasfirma,
        favorito: payload.Favorito,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, message: data?.message ?? 'No se pudo guardar la firma.' };
    }

    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado al guardar la firma.' };
    }

    return { ok: false, message: 'No se pudo guardar la firma.' };
  }
}

