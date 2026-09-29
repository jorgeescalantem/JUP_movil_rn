// Environment configuration.
// Values are injected at build/dev time by Expo from the `.env` file
// (variables prefixed with EXPO_PUBLIC_ are exposed to the client bundle).
// IMPORTANT: any EXPO_PUBLIC_* value is bundled into the compiled JS and can
// be extracted from the installed app - never put real secrets here. All
// backend calls now go exclusively through jup-api (our own backend, which
// holds the actual system/DB/EmailJS credentials server-side); the client
// only ever needs jup-api's public base URL plus a per-user JWT it gets back
// from `/auth/login`.
const JUP_API_URL = process.env.EXPO_PUBLIC_JUP_API_URL ?? '';

if (__DEV__ && !JUP_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] Falta la variable de entorno EXPO_PUBLIC_JUP_API_URL. Revisa el archivo .env (usa .env.example como referencia).',
  );
}

export const env = {
  jupApiUrl: JUP_API_URL,
};