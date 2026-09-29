import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';

const ONBOARDING_DONE_KEY = 'jup-permissions-onboarding-done';

// expo-notifications no se puede ni siquiera importar en Expo Go (SDK 53+):
// tira un runtime error al cargar el modulo, no solo al pedir el permiso.
function isRunningInExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Whether the user has already gone through the permissions onboarding once (device-level, not per-account). */
export async function hasCompletedPermissionsOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markPermissionsOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {
    // Best-effort: if it can't persist, the onboarding just shows again next launch.
  }
}

export type PermissionStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

/** Ubicacion - necesaria para calcular rutas/distancias a origen y destino del servicio. */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Telefono - la app solo abre el marcador nativo via `Linking.openURL('tel:...')`,
 * lo cual NO requiere el permiso CALL_PHONE (ese permiso solo aplica a apps que
 * inician la llamada directamente sin pasar por el marcador). No hay nada que
 * pedir a nivel de sistema, asi que se confirma de una vez.
 */
export async function requestPhonePermission(): Promise<PermissionStatus> {
  return 'granted';
}

/** Notificaciones - avisos de nuevos servicios asignados y cambios de estado. */
export async function requestNotificationsPermission(): Promise<PermissionStatus> {
  if (isRunningInExpoGo()) {
    // No disponible en Expo Go (SDK 53+) - funciona en un build nativo/EAS.
    return 'unavailable';
  }

  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export type BiometricKind = 'fingerprint' | 'faceId';

/** Verifica si el dispositivo soporta huella / reconocimiento facial (sin disparar el prompt). */
export async function getSupportedBiometrics(): Promise<Record<BiometricKind, boolean>> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { fingerprint: false, faceId: false };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return {
      fingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      faceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
    };
  } catch {
    return { fingerprint: false, faceId: false };
  }
}

/**
 * Dispara el prompt nativo de huella/FaceID - en iOS esta es la unica forma de
 * activar el dialogo de consentimiento de Face ID (NSFaceIDUsageDescription).
 */
export async function requestBiometricPermission(kind: BiometricKind): Promise<PermissionStatus> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return 'unavailable';
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return 'unavailable';
    }

    const promptMessage = kind === 'faceId' ? 'Confirma con Face ID' : 'Confirma con tu huella';
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancelar' });

    return result.success ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
