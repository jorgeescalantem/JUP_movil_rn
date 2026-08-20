import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'jup-mobile-biometric-credentials';

type StoredCredentials = { username: string; password: string };

/** Saves the credentials used for a successful login so biometrics can replay it later. */
export async function saveBiometricCredentials(username: string, password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ username, password }));
  } catch {
    // Best-effort: if SecureStore isn't available, biometric login simply won't be offered.
  }
}

/** Removes stored credentials on logout so biometrics can't log back in on this device. */
export async function clearBiometricCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch {
    // no-op
  }
}

async function getBiometricCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as StoredCredentials) : null;
  } catch {
    return null;
  }
}

export type BiometricLoginResult =
  | { ok: true; username: string; password: string }
  | { ok: false; message: string };

/**
 * Prompts the device's fingerprint/FaceID and, on success, returns the
 * credentials saved from the last successful manual login.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricLoginResult> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();

  if (!hasHardware) {
    return { ok: false, message: 'Este dispositivo no tiene sensor de huella o reconocimiento facial.' };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!isEnrolled) {
    return {
      ok: false,
      message: 'No hay huella o rostro configurado en este dispositivo. Configuralo en los ajustes del sistema.',
    };
  }

  const stored = await getBiometricCredentials();

  if (!stored) {
    return {
      ok: false,
      message: 'Ingresa con usuario y contrasena primero para activar el acceso biometrico.',
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancelar',
  });

  if (!result.success) {
    return { ok: false, message: 'Autenticacion biometrica cancelada.' };
  }

  return { ok: true, username: stored.username, password: stored.password };
}
