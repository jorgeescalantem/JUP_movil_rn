import { env } from '../config/env';
import { PreoperationalQuestion } from '../mocks/preoperational';
import { ODataListResponse, TppreoperacionRecord } from '../types/api';

const REQUEST_TIMEOUT_MS = 10000;

export type PreoperationalFetchResult =
  | { ok: true; questions: PreoperationalQuestion[] }
  | { ok: false; message: string };

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Tppreoperacion lives on its own host; tokens issued by the main API host
// are rejected here, so a dedicated login against this host is required.
async function getPreopToken(): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/api/auth/login`, {
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
 * Fetches the active checklist items from Tppreoperacion, sorted by `Orden`.
 * KILOMETRAJE/OBSERVACIONES (`Editar: true`) are rendered as dedicated
 * free-text fields by the screen itself, so only SI/NO/NO_APLICA items
 * (`Editar: false`) are returned here.
 */
export async function fetchPreoperationalQuestions(): Promise<PreoperationalFetchResult> {
  const token = await getPreopToken();

  if (!token) {
    return { ok: false, message: 'No se pudo establecer conexion con el servidor de preoperacionales.' };
  }

  const query = new URLSearchParams({
    $top: '50',
    $count: 'true',
    $filter: 'Activo eq true',
    $orderby: 'Orden',
  });

  try {
    const response = await fetchWithTimeout(`${env.preopBaseUrl}/oData/Tppreoperacion?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!response.ok) {
      return { ok: false, message: 'No se pudo cargar la encuesta preoperacional.' };
    }

    const payload = (await response.json()) as ODataListResponse<TppreoperacionRecord>;
    const questions = payload.value
      .filter((record) => !record.Editar)
      .map((record) => ({ id: String(record.Id), text: record.Concepto.trim() }));

    if (questions.length === 0) {
      return { ok: false, message: 'La encuesta preoperacional no tiene preguntas configuradas.' };
    }

    return { ok: true, questions };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Tiempo de espera agotado al cargar la encuesta preoperacional.' };
    }

    return { ok: false, message: 'No se pudo cargar la encuesta preoperacional.' };
  }
}
