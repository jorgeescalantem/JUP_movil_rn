/**
 * Lightweight in-memory holder for the system-level API token obtained
 * during the app's initial connectivity check (see ConnectivityGate /
 * checkApiConnection). The token is reused to authenticate subsequent
 * API/OData calls (e.g. the real user login against TusuarioMobil).
 *
 * This intentionally lives outside React state: it does not need to
 * trigger re-renders, it is only read at call time by service functions,
 * and it is never persisted to disk.
 */
let systemToken: string | null = null;

export function setSystemToken(token: string | null) {
  systemToken = token;
}

export function getSystemToken(): string | null {
  return systemToken;
}
