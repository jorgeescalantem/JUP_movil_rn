import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type ServiceActionResult = { ok: true } | { ok: false; message: string };

async function postAction(path: string, body?: unknown): Promise<ServiceActionResult> {
  try {
    const response = await jupApiFetch(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, message: data?.message ?? 'No se pudo completar la accion.' };
    }

    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado. Verifica tu conexion a internet.' };
    }

    return { ok: false, message: 'No se pudo completar la accion.' };
  }
}

/** Paso 1: LLEGUE AL ORIGEN - via jup-api (ASIGNADO -> PROGRESO, registra FECHA_INICIO). */
export function arriveAtOrigin(numeroServicio: string): Promise<ServiceActionResult> {
  return postAction(`/services/${numeroServicio}/arrive-origin`);
}

/** Paso 2: LLEGUE AL DESTINO - via jup-api (PROGRESO -> TERMINADO). */
export function arriveAtDestination(numeroServicio: string): Promise<ServiceActionResult> {
  return postAction(`/services/${numeroServicio}/arrive-destination`);
}

/** Paso 3: encuesta de satisfaccion - via jup-api (guarda en SERVOBSERVACIONES, solo si TERMINADO). */
export function submitServiceSurvey(
  numeroServicio: string,
  calificacion: number,
  comentario: string,
): Promise<ServiceActionResult> {
  return postAction(`/services/${numeroServicio}/survey`, { calificacion, comentario });
}

export type CompleteServicePayload = {
  guia: string;
  codorden: number;
  noorden: string;
  fechaServicioFirma: string;
  horaServicioFirma: string;
  placa: string;
  firma: string;
  firmaguia: number | null;
  cordenadasFirma: string;
  favorito: boolean;
};

/** Paso 4: firma + TERMINADO -> COMPLETO + GUIA, en una sola transaccion - via jup-api. */
export function completeService(numeroServicio: string, payload: CompleteServicePayload): Promise<ServiceActionResult> {
  return postAction(`/services/${numeroServicio}/complete`, payload);
}
