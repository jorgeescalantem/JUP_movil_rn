import { env } from '../config/env';
import { PreoperationalQuestion } from '../mocks/preoperational';
import { ODataListResponse, TppreoperacionRecord } from '../types/api';
import { fetchWithTimeout, getJupwebCoToken } from './jupwebCoAuth';

export type PreoperationalFetchResult =
  | { ok: true; questions: PreoperationalQuestion[] }
  | { ok: false; message: string };

/**
 * Fetches the active checklist items from Tppreoperacion, sorted by `Orden`.
 * KILOMETRAJE/OBSERVACIONES (`Editar: true`) are rendered as dedicated
 * free-text fields by the screen itself, so only SI/NO/NO_APLICA items
 * (`Editar: false`) are returned here.
 */
export async function fetchPreoperationalQuestions(): Promise<PreoperationalFetchResult> {
  const token = await getJupwebCoToken();

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
