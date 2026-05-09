import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { spacing } from '../theme';

function formatDateOnly(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('es-CO');
}

function formatTimeOnly(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

type DetailRoute = RouteProp<DrawerParamList, 'ServicioDetalle'>;

function buildMapUrl(lat: number, lng: number, app: 'google' | 'waze') {
  if (app === 'waze') {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function ServiceDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { services, arrivedAtOrigin } = useSession();

  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [originCode, setOriginCode] = useState('');
  const [originError, setOriginError] = useState<string | null>(null);

  const service = useMemo(
    () => services.find((item) => item.numeroServicio === route.params.serviceNumber) ?? null,
    [route.params.serviceNumber, services],
  );

  if (!service) {
    return (
      <View style={styles.detailScreen}>
        <View style={styles.detailHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <MaterialCommunityIcons color="#0f172a" name="arrow-left" size={26} />
          </Pressable>
          <Text style={styles.detailHeaderTitle}>Detalle no disponible</Text>
          <View style={styles.headerIconButton} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No se encontro el servicio seleccionado.</Text>
        </View>
      </View>
    );
  }

  const openExternalUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert('No disponible', 'No se pudo abrir la accion solicitada.');
      return;
    }

    await Linking.openURL(url);
  };

  const openPhones = () => {
    if (service.telefonos.length === 0) {
      Alert.alert('Sin telefonos', 'Este servicio no tiene telefonos disponibles.');
      return;
    }

    Alert.alert(
      'Telefonos disponibles',
      'Selecciona un numero para llamar al paciente.',
      [
        ...service.telefonos.map((phone) => ({
          text: phone,
          onPress: () => openExternalUrl(`tel:${phone}`),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  const handleConfirmOriginCode = () => {
    if (String(originCode).trim() !== String(service.numeroServicio).trim()) {
      setOriginError('Codigo incorrecto. Intenta nuevamente o cancela.');
      return;
    }

    const result = arrivedAtOrigin(service.numeroServicio, originCode);

    if (!result.ok) {
      setOriginError(result.message ?? 'Codigo incorrecto. Intenta nuevamente.');
      return;
    }

    setOriginDialogOpen(false);
    setOriginCode('');
    setOriginError(null);
    Alert.alert('Codigo correcto', 'Validacion correcta. El flujo continua con el servicio en transito.');
  };

  return (
    <View style={styles.detailScreen}>
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setOriginDialogOpen(false);
          setOriginCode('');
          setOriginError(null);
        }}
        transparent
        visible={originDialogOpen}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Llegue al origen</Text>
            <Text style={styles.dialogSubtitle}>
              Ingresa el codigo del servicio para validar la llegada. El numero de servicio permanece oculto.
            </Text>

            <TextInput
              autoFocus
              keyboardType="number-pad"
              onChangeText={(value) => {
                setOriginCode(value);
                if (originError) setOriginError(null);
              }}
              placeholder="Codigo de servicio"
              placeholderTextColor="#7b8791"
              style={styles.dialogInput}
              value={originCode}
            />

            {originError ? <Text style={styles.dialogError}>{originError}</Text> : null}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => {
                  setOriginDialogOpen(false);
                  setOriginCode('');
                  setOriginError(null);
                }}
                style={[styles.dialogButton, styles.dialogCancelButton]}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleConfirmOriginCode} style={[styles.dialogButton, styles.dialogConfirmButton]}>
                <Text style={styles.dialogConfirmText}>Validar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.detailHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <MaterialCommunityIcons color="#0f172a" name="arrow-left" size={26} />
        </Pressable>
        <View style={styles.headerQuickActions}>
          <Pressable onPress={openPhones} style={styles.headerMiniAction}>
            <MaterialCommunityIcons color="#0f172a" name="phone-outline" size={18} />
          </Pressable>
          <Pressable
            onPress={() => openExternalUrl(buildMapUrl(service.origenLat, service.origenLng, 'google'))}
            style={styles.headerMiniAction}
          >
            <MaterialCommunityIcons color="#ff6424" name="google-maps" size={18} />
          </Pressable>
          <Pressable
            onPress={() => openExternalUrl(buildMapUrl(service.origenLat, service.origenLng, 'waze'))}
            style={styles.headerMiniAction}
          >
            <FontAwesome5 color="#169cf3" name="waze" size={15} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailCard}>
          <View style={styles.detailSplitRow}>
            <View style={styles.detailHalfBlock}>
              <View style={styles.detailLabelRow}>
                <MaterialCommunityIcons color="#8b98a3" name="calendar-month-outline" size={16} />
                <Text style={styles.detailLabel}>FECHA</Text>
              </View>
              <Text style={styles.detailValue}>{formatDateOnly(service.fechaServicio)}</Text>
            </View>
            <View style={styles.detailHalfBlock}>
              <View style={styles.detailLabelRow}>
                <MaterialCommunityIcons color="#8b98a3" name="clock-outline" size={16} />
                <Text style={styles.detailLabel}>HORA</Text>
              </View>
              <Text style={styles.detailValue}>{formatTimeOnly(service.fechaServicio)}</Text>
            </View>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="map-marker-path" size={16} />
              <Text style={styles.detailLabel}>ORIGEN</Text>
            </View>
            <Text style={styles.detailValueMultiline}>{service.origenDireccion.toUpperCase()}</Text>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="map-marker-check-outline" size={16} />
              <Text style={styles.detailLabel}>DESTINO</Text>
            </View>
            <Text style={styles.detailValueMultiline}>{service.destinoDireccion.toUpperCase()}</Text>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="text-box-outline" size={16} />
              <Text style={styles.detailLabel}>OBSERVACIONES</Text>
            </View>
            <Text style={styles.detailValueMuted}>{service.zona || 'Sin observaciones'}</Text>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="account-outline" size={16} />
              <Text style={styles.detailLabel}>CLIENTE</Text>
            </View>
            <Text style={styles.detailValueMultiline}>
              {`${service.clienteNombre.toUpperCase()} (CC ${service.clienteDocumento})`}
            </Text>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="phone-outline" size={16} />
              <Text style={styles.detailLabel}>TELEFONOS</Text>
            </View>
            <Text style={styles.detailValueMultiline}>{service.telefonos.join(', ')}</Text>
          </View>

          <View style={styles.detailRowBlock}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="cash-refund" size={16} />
              <Text style={styles.detailLabel}>COPAGO</Text>
            </View>
            <Text style={styles.detailValue}>{formatCurrency(service.copago)}</Text>
          </View>

          <View style={styles.detailRowBlockLast}>
            <View style={styles.detailLabelRow}>
              <MaterialCommunityIcons color="#8b98a3" name="office-building-outline" size={16} />
              <Text style={styles.detailLabel}>COMPANIA</Text>
            </View>
            <Text style={styles.detailValueMultiline}>{service.companiaNombre.toUpperCase()}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.detailFooter}>
        <Pressable
          onPress={() => setOriginDialogOpen(true)}
          style={styles.detailStatusButtonPressable}
        >
          <LinearGradient
            colors={['#ff7b39', '#ff6424', '#f54d14']}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.detailStatusButton}
          >
            <MaterialCommunityIcons color="#ffffff" name="arrow-right-bold" size={18} />
            <Text style={styles.detailStatusButtonText}>Llegue al origen</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailScreen: {
    backgroundColor: '#eef2f5',
    flex: 1,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerIconButton: {
    minWidth: 28,
    padding: 2,
  },
  headerQuickActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerMiniAction: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ec',
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  detailContent: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailCard: {
    backgroundColor: '#eef2f5',
  },
  detailSplitRow: {
    borderBottomColor: '#d2d9df',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailHalfBlock: {
    flex: 1,
    gap: 4,
  },
  detailRowBlock: {
    borderBottomColor: '#d2d9df',
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: spacing.sm,
  },
  detailRowBlockLast: {
    borderBottomColor: '#d2d9df',
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: spacing.sm,
  },
  detailLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  detailLabel: {
    color: '#97a1aa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  detailValueMultiline: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  detailValueMuted: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  detailFooter: {
    backgroundColor: '#eef2f5',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  detailStatusButtonPressable: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  detailStatusButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  detailStatusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dialogOverlay: {
    alignItems: 'center',
    backgroundColor: '#00000066',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e1e8',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  dialogTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSubtitle: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 20,
  },
  dialogInput: {
    backgroundColor: '#f7fafc',
    borderColor: '#c8d6e5',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dialogError: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  dialogCancelButton: {
    backgroundColor: '#eff3f7',
  },
  dialogConfirmButton: {
    backgroundColor: '#ff6424',
  },
  dialogCancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  dialogConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
  },
});
