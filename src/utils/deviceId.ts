import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_STORAGE_KEY = 'jup-mobile-device-id';

function generateUuidV4(): string {
  // RFC4122-ish v4 UUID. This only needs to be a stable, effectively-unique
  // local identifier (not used for cryptographic purposes).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

let cachedDeviceId: string | null = null;

/**
 * Returns a stable identifier for this app installation, persisted in
 * AsyncStorage. Used to bind a user's account to a single device via
 * the MobilKey field on TusuarioMobil, preventing concurrent sessions
 * on different devices.
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);

  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const generated = generateUuidV4();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  cachedDeviceId = generated;

  return generated;
}

/**
 * Short form of the device id (last UUID segment, e.g. "ddbe3467b9ad") used
 * for MobilKey: easier for support to read/type than the full UUID, and
 * matches the length already used by existing MobilKey values in the DB.
 */
export async function getShortDeviceId(): Promise<string> {
  const fullId = await getDeviceId();
  const segments = fullId.split('-');
  return segments[segments.length - 1];
}
