import { PreoperationalOption, PreoperationalQuestion } from '../mocks/preoperational';
import { isTimeoutError, jupApiFetch } from './jupApiClient';

export type PreoperationalFetchResult =
  | { ok: true; questions: PreoperationalQuestion[] }
  | { ok: false; message: string };

/** Catalogo activo del checklist (KILOMETRAJE/OBSERVACIONES se manejan aparte en la pantalla) - via jup-api. */
export async function fetchPreoperationalQuestions(): Promise<PreoperationalFetchResult> {
  try {
    const response = await jupApiFetch('/preoperational/questions');
    const data = (await response.json().catch(() => null)) as
      | { questions?: { id: number; text: string }[]; message?: string }
      | null;

    if (!response.ok || !data?.questions) {
      return { ok: false, message: data?.message ?? 'No se pudo cargar la encuesta preoperacional.' };
    }

    if (data.questions.length === 0) {
      return { ok: false, message: 'La encuesta preoperacional no tiene preguntas configuradas.' };
    }

    return { ok: true, questions: data.questions.map((question) => ({ id: String(question.id), text: question.text })) };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado al cargar la encuesta preoperacional.' };
    }

    return { ok: false, message: 'No se pudo cargar la encuesta preoperacional.' };
  }
}

export type SubmitPreoperationalResult = { ok: true } | { ok: false; message: string };

/** Envia las respuestas del preoperacional - via jup-api (guarda en TBPREOPERACIONALES). */
export async function submitPreoperationalAnswers(params: {
  vehiculo: number;
  answers: Record<string, PreoperationalOption>;
  mileage: string;
  observations: string;
}): Promise<SubmitPreoperationalResult> {
  try {
    const response = await jupApiFetch('/preoperational/answers', {
      method: 'POST',
      body: JSON.stringify({
        vehiculo: params.vehiculo,
        answers: Object.entries(params.answers).map(([questionId, valor]) => ({ questionId: Number(questionId), valor })),
        mileage: params.mileage,
        observations: params.observations,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, message: data?.message ?? 'No se pudo enviar la encuesta preoperacional.' };
    }

    return { ok: true };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, message: 'Tiempo de espera agotado al enviar la encuesta preoperacional.' };
    }

    return { ok: false, message: 'No se pudo enviar la encuesta preoperacional.' };
  }
}

