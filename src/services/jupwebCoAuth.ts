import { env } from '../config/env';

const REQUEST_TIMEOUT_MS = 10000;

export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// jupweb.co (Tppreoperacion, Tbserviciosview, ...) is a separate host from the
// main API; tokens issued there are rejected here, so a dedicated login is required.
export async function getJupwebCoToken(): Promise<string | null> {
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
