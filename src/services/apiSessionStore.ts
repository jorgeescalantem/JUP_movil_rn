/**
 * Lightweight in-memory holder for the JWT issued by jup-api's own
 * `/auth/login`, used to authenticate every call to our backend. Lives
 * outside React state: it does not need to trigger re-renders, it is only
 * read at call time by service functions, and it is never persisted to disk.
 */
let jupApiToken: string | null = null;

export function setJupApiToken(token: string | null) {
  jupApiToken = token;
}

export function getJupApiToken(): string | null {
  return jupApiToken;
}
