import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, MapPin, Phone, type LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import {
  BiometricKind,
  PermissionStatus,
  getSupportedBiometrics,
  markPermissionsOnboardingDone,
  requestBiometricPermission,
  requestLocationPermission,
  requestNotificationsPermission,
  requestPhonePermission,
} from '../services/permissionsFlow';
import { radius, spacing, useTheme, type ThemeColors } from '../theme';

type PermissionsScreenProps = {
  onDone: () => void;
};

type PermissionKey = 'location' | 'phone' | 'notifications' | 'fingerprint' | 'faceId';

type PermissionItem = {
  key: PermissionKey;
  title: string;
  description: string;
  status: PermissionStatus;
};

const STATUS_LABEL: Record<PermissionStatus, string> = {
  pending: 'Pendiente',
  granted: 'Concedido',
  denied: 'No concedido',
  unavailable: 'No disponible',
};

function StatusPill({ status }: { status: PermissionStatus }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tone =
    status === 'granted'
      ? { bg: colors.successSoft, color: colors.success }
      : status === 'denied'
        ? { bg: colors.dangerSoft, color: colors.danger }
        : status === 'unavailable'
          ? { bg: colors.neutralSoft, color: colors.muted }
          : { bg: colors.blueSoft, color: colors.blue };

  return (
    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.statusPillText, { color: tone.color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function PermissionIcon({ permissionKey, color, size }: { permissionKey: PermissionKey; color: string; size: number }) {
  const LUCIDE_ICONS: Partial<Record<PermissionKey, LucideIcon>> = {
    location: MapPin,
    phone: Phone,
    notifications: Bell,
  };

  const Icon = LUCIDE_ICONS[permissionKey];
  if (Icon) {
    return <Icon color={color} size={size} strokeWidth={2.2} />;
  }

  const materialName = permissionKey === 'faceId' ? 'face-recognition' : 'fingerprint';
  return <MaterialCommunityIcons color={color} name={materialName} size={size} />;
}

function PermissionCard({
  item,
  onRequest,
  isBusy,
}: {
  item: PermissionItem;
  onRequest: (key: PermissionKey) => void;
  isBusy: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const canRequest = item.status !== 'granted' && item.status !== 'unavailable';

  return (
    <View style={styles.card}>
      <View style={styles.cardIconWrap}>
        <PermissionIcon color={colors.blue} permissionKey={item.key} size={24} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <StatusPill status={item.status} />
        </View>
        <Text style={styles.cardDescription}>{item.description}</Text>
        {canRequest ? (
          <Pressable
            disabled={isBusy}
            onPress={() => onRequest(item.key)}
            style={[styles.permitButton, isBusy ? styles.permitButtonDisabled : null]}
          >
            <Text style={styles.permitButtonText}>Permitir</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Onboarding de permisos requerido antes del registro/login (politicas de
 * Google Play / App Store): ubicacion, telefono, notificaciones y biometria.
 * Se muestra una sola vez por dispositivo (ver permissionsFlow.ts).
 */
export function PermissionsScreen({ onDone }: PermissionsScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<PermissionItem[]>([
    { key: 'location', title: 'Ubicacion', description: 'Para calcular rutas y distancias entre el origen y destino de cada servicio.', status: 'pending' },
    { key: 'phone', title: 'Telefono', description: 'Para llamar directamente a clientes y pacientes desde el detalle del servicio.', status: 'pending' },
    { key: 'notifications', title: 'Notificaciones', description: 'Para avisarte cuando se te asigne un nuevo servicio o cambie de estado.', status: 'pending' },
    { key: 'fingerprint', title: 'Huella dactilar', description: 'Para iniciar sesion mas rapido con tu huella en este dispositivo.', status: 'pending' },
    { key: 'faceId', title: 'Face ID', description: 'Para iniciar sesion mas rapido con reconocimiento facial en este dispositivo.', status: 'pending' },
  ]);
  const [busyKey, setBusyKey] = useState<PermissionKey | null>(null);

  useEffect(() => {
    getSupportedBiometrics().then(({ fingerprint, faceId }) => {
      setItems((current) =>
        current.map((item) => {
          if (item.key === 'fingerprint' && !fingerprint) {
            return { ...item, status: 'unavailable' };
          }
          if (item.key === 'faceId' && !faceId) {
            return { ...item, status: 'unavailable' };
          }
          return item;
        }),
      );
    });
  }, []);

  const updateStatus = (key: PermissionKey, status: PermissionStatus) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, status } : item)));
  };

  const handleRequest = async (key: PermissionKey) => {
    if (busyKey) {
      return;
    }

    setBusyKey(key);

    try {
      let status: PermissionStatus;

      if (key === 'location') {
        status = await requestLocationPermission();
      } else if (key === 'phone') {
        status = await requestPhonePermission();
      } else if (key === 'notifications') {
        status = await requestNotificationsPermission();
      } else {
        status = await requestBiometricPermission(key as BiometricKind);
      }

      updateStatus(key, status);
    } finally {
      setBusyKey(null);
    }
  };

  const handleContinue = async () => {
    await markPermissionsOnboardingDone();
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>JUP movil</Text>
        <Text style={styles.title}>Permisos necesarios</Text>
        <Text style={styles.subtitle}>
          Antes de continuar, autoriza estos accesos. Puedes concederlos ahora o mas tarde desde los ajustes del
          sistema.
        </Text>
      </View>

      {items.map((item) => (
        <PermissionCard isBusy={busyKey === item.key} item={item} key={item.key} onRequest={handleRequest} />
      ))}

      <Pressable onPress={handleContinue} style={styles.continueButton}>
        <LinearGradient
          colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.continueGradient}
        >
          <Text style={styles.continueText}>Continuar</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      backgroundColor: colors.background,
      flexGrow: 1,
      gap: spacing.md,
      padding: spacing.lg,
      paddingTop: spacing.xl,
    },
    header: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    eyebrow: {
      color: colors.blue,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.textStrong,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.xl,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    cardIconWrap: {
      alignItems: 'center',
      backgroundColor: colors.blueSoft,
      borderRadius: radius.lg,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    cardBody: {
      flex: 1,
      gap: 6,
    },
    cardHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    cardTitle: {
      color: colors.textStrong,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '800',
    },
    cardDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    statusPill: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    permitButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.blue,
      borderRadius: radius.pill,
      marginTop: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    permitButtonDisabled: {
      opacity: 0.6,
    },
    permitButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
    },
    continueButton: {
      borderRadius: radius.pill,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    continueGradient: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    continueText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
  });
}
