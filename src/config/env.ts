// Environment configuration.
// Values are injected at build/dev time by Expo from the `.env` file
// (variables prefixed with EXPO_PUBLIC_ are exposed to the client bundle).
// IMPORTANT: `.env` is gitignored so real credentials never reach source control,
// but keep in mind that any EXPO_PUBLIC_* value is still bundled into the compiled
// JS and can be extracted from the installed app. Do not put highly sensitive
// secrets here beyond what is strictly required for this client-side check.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const API_AUTH_USER = process.env.EXPO_PUBLIC_API_AUTH_USER ?? '';
const API_AUTH_PWD = process.env.EXPO_PUBLIC_API_AUTH_PWD ?? '';
const API_ODATA_URL = process.env.EXPO_PUBLIC_API_ODATA_URL ?? '';
// Tppreoperacion lives on a separate host; tokens issued for API_BASE_URL are not accepted there.
const API_PREOP_BASE_URL = process.env.EXPO_PUBLIC_API_PREOP_BASE_URL ?? '';

if (__DEV__ && (!API_BASE_URL || !API_AUTH_USER || !API_AUTH_PWD)) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] Faltan variables de entorno EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_AUTH_USER / EXPO_PUBLIC_API_AUTH_PWD. Revisa el archivo .env (usa .env.example como referencia).',
  );
}

if (__DEV__ && !API_ODATA_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] Falta la variable de entorno EXPO_PUBLIC_API_ODATA_URL. Revisa el archivo .env (usa .env.example como referencia).',
  );
}

export const env = {
  apiBaseUrl: API_BASE_URL,
  apiAuthUser: API_AUTH_USER,
  apiAuthPwd: API_AUTH_PWD,
  apiODataUrl: API_ODATA_URL,
  preopBaseUrl: API_PREOP_BASE_URL,
};