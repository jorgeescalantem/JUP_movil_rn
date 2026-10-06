import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MoonStar, SunMedium } from 'lucide-react-native';

import { RoleGate } from '../components/RoleGate';
import { DrawerParamList } from '../navigation/AppDrawer';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { spacing, useTheme, type ThemeColors } from '../theme';
import { Service, ServiceState } from '../types/domain';

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// 👇 Ahora apunta al destino si el servicio está en tránsito o terminado.
// Si está asignado, apunta al origen.
function buildMapUrl(service: Service, app: 'google' | 'waze') {
  const goToDestination =
    service.estado === 'EN_TRANSITO' || service.estado === 'TERMINADO';

  const lat = goToDestination ? service.destinoLat : service.origenLat;
  const lng = goToDestination ? service.destinoLng : service.origenLng;

  if (app === 'waze') {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function buildStateColors(colors: ThemeColors): Record<ServiceState, string> {
  return {
    ASIGNADA: colors.warning,
    EN_TRANSITO: colors.info,
    TERMINADO: colors.muted,
    COMPLETADO: colors.blue,
    procesado: colors.blue,
  };
}

function formatStatusLabel(status: ServiceState) {
  if (status === 'ASIGNADA') return 'ASIGNADO';
  return status.replace('_', ' ');
}

type ModalConfig = { type: 'origin'; serviceNumber: string } | null;

// 👇 Card lateral para uniformar bordes con la pantalla
const CARD_MARGIN = 16;

export function ServicesScreen() {
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const {
    services,
    activeService,
    arrivedAtOrigin,
    arrivedAtDestination,
    isLoadingServices,
    servicesLoadError,
    reloadAssignedServices,
  } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATE_COLORS = useMemo(() => buildStateColors(colors), [colors]);
  const { isDark, toggle } = useTheme();
  const ThemeIcon = isDark ? SunMedium : MoonStar;
  const [modalConfig, setModalConfig] = useState<ModalConfig>(null);
  const [codeInput, setCodeInput] = useState('');
  const [phonesDialogService, setPhonesDialogService] = useState<Service | null>(null);
  const [destinationConfirmService, setDestinationConfirmService] = useState<Service | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{ title: string; message: string } | null>(null);
  const [isValidatingOrigin, setIsValidatingOrigin] = useState(false);

  // ─── Refs y estado para el FAB de subir al inicio ──────────
  const scrollViewRef = useRef<ScrollView>(null);
  const firstServiceY = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const visibleServices = Array.from(
    new Map(
      services
        .filter(
          (service) =>
            service.estado === 'ASIGNADA' ||
            service.estado === 'EN_TRANSITO' ||
            service.estado === 'TERMINADO',
        )
        .map((service) => [service.numeroServicio, service]),
    ).values(),
  );

  const orderedServices = [...visibleServices].sort(
    (a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime(),
  );

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setFeedbackDialog({ title: 'No disponible', message: 'No se pudo abrir la accion solicitada.' });
    }
  };

  const openPhones = (service: Service) => {
    if (service.telefonos.length === 0) {
      setFeedbackDialog({ title: 'Sin telefonos', message: 'Este servicio no tiene telefonos disponibles.' });
      return;
    }
    setPhonesDialogService(service);
  };

  const handleRefresh = () => {
    reloadAssignedServices();
  };

  const handleModalConfirm = async () => {
    if (!modalConfig) return;
    setIsValidatingOrigin(true);
    try {
      const result = await arrivedAtOrigin(modalConfig.serviceNumber, codeInput);
      if (!result.ok) {
        setFeedbackDialog({ title: 'No fue posible continuar', message: result.message ?? 'Intenta nuevamente.' });
        return;
      }
      setModalConfig(null);
      setCodeInput('');
    } finally {
      setIsValidatingOrigin(false);
    }
  };

  const confirmArrivedAtDestination = async () => {
    if (!destinationConfirmService) return;
    const result = await arrivedAtDestination(destinationConfirmService.numeroServicio);
    setDestinationConfirmService(null);
    if (!result.ok) {
      setFeedbackDialog({ title: 'No fue posible continuar', message: result.message ?? 'Intenta nuevamente.' });
    }
  };

  // ─── FAB: mostrar cuando pasamos del primer servicio ──────
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const threshold = firstServiceY.current > 0 ? firstServiceY.current : 300;
    setShowScrollTop(y > threshold);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ animated: true, y: 0 });
  };

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        ref={scrollViewRef}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isLoadingServices} />}
        scrollEventThrottle={16}
      >
        <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO', 'AMBOS']}>
          {/* Modal para validaciones con input */}
          <Modal animationType="fade" onRequestClose={() => setModalConfig(null)} transparent visible={!!modalConfig}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>llegué al origen</Text>
                <Text style={styles.modalSubtitle}>
                  Ingresa el número de servicio para confirmar tu llegada al origen e iniciar el recorrido.
                </Text>
                <TextInput
                  autoFocus
                  keyboardType="number-pad"
                  onChangeText={setCodeInput}
                  placeholder="Código de servicio"
                  placeholderTextColor={colors.muted}
                  style={styles.modalInput}
                  value={codeInput}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => { setModalConfig(null); setCodeInput(''); }}
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                  >
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={handleModalConfirm} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                    {isValidatingOrigin ? (
                      <View style={styles.modalBtnLoading}>
                        <ActivityIndicator color={colors.textStrong} size="small" />
                        <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>Validando</Text>
                      </View>
                    ) : (
                      <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>Confirmar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setPhonesDialogService(null)}
            transparent
            visible={!!phonesDialogService}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Telefonos disponibles</Text>
                <Text style={styles.modalSubtitle}>Selecciona un numero para llamar al paciente.</Text>

                <View style={styles.modalList}>
                  {/* Deduplicado + keys únicas (fix del error) */}
                  {Array.from(new Set(phonesDialogService?.telefonos ?? [])).map((phone, index) => (
                    <Pressable
                      key={`${phone}-${index}`}
                      onPress={() => {
                        setPhonesDialogService(null);
                        void openExternalUrl(`tel:${phone}`);
                      }}
                      style={[styles.modalBtn, styles.modalBtnConfirm, styles.modalSingleActionBtn]}
                    >
                      <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>{phone}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => setPhonesDialogService(null)}
                  style={[styles.modalBtn, styles.modalBtnCancel, styles.modalSingleActionBtn]}
                >
                  <Text style={styles.modalBtnText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setDestinationConfirmService(null)}
            transparent
            visible={!!destinationConfirmService}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Llegué al destino</Text>
                <Text style={styles.modalSubtitle}>¿Confirmas que llegaste al destino de este servicio?</Text>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => setDestinationConfirmService(null)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                    <Text style={styles.modalBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={confirmArrivedAtDestination} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                    <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>Confirmar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setFeedbackDialog(null)}
            transparent
            visible={!!feedbackDialog}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{feedbackDialog?.title}</Text>
                <Text style={styles.modalSubtitle}>{feedbackDialog?.message}</Text>
                <Pressable
                  onPress={() => setFeedbackDialog(null)}
                  style={[styles.modalBtn, styles.modalBtnConfirm, styles.modalSingleActionBtn]}
                >
                  <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>Aceptar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <View style={styles.listContainer}>
            <Pressable
              accessibilityLabel="Cambiar tema"
              hitSlop={8}
              onPress={toggle}
              style={styles.themeToggle}
            >
              <ThemeIcon color={colors.blue} size={20} />
            </Pressable>

            {servicesLoadError ? (
              <Pressable onPress={reloadAssignedServices} style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{servicesLoadError} Toca para reintentar.</Text>
              </Pressable>
            ) : null}

            {activeService ? (
              <Pressable
                onPress={() => navigation.navigate('ServicioDetalle', { serviceNumber: activeService.numeroServicio })}
                style={styles.activeBanner}
              >
                <Text style={styles.activeLabel}>Servicio activo</Text>
                <Text style={styles.activeText}>
                  #{activeService.numeroServicio} — {formatStatusLabel(activeService.estado)}
                </Text>
              </Pressable>
            ) : null}

            {orderedServices.map((service, index) => {
              const isInTransit = service.estado === 'EN_TRANSITO';
              const isFinished = service.estado === 'TERMINADO';
              const isBlocked = !!activeService && activeService.numeroServicio !== service.numeroServicio;
              const goToDestination = isInTransit || isFinished;

              return (
                <Pressable
                  key={`${service.orden}-${service.numeroServicio}`}
                  onLayout={
                    index === 0
                      ? (e) => { firstServiceY.current = e.nativeEvent.layout.y; }
                      : undefined
                  }
                  onPress={() => navigation.navigate('ServicioDetalle', { serviceNumber: service.numeroServicio })}
                  style={[
                    styles.serviceCard,
                    isInTransit ? styles.serviceCardInTransit : null,
                    isFinished ? styles.serviceCardFinished : null,
                  ]}
                >
                  <View style={styles.infoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Contrato</Text>
                      <View style={styles.contractWrap}>
                        <MaterialCommunityIcons color={colors.blue} name="file-document-outline" size={19} />
                        <Text style={styles.contractText}>{service.contrato}</Text>
                      </View>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Estado</Text>
                      <View
                        style={[
                          styles.statePill,
                          isInTransit ? styles.statePillTransit : { backgroundColor: STATE_COLORS[service.estado] + '22' },
                        ]}
                      >
                        <Text style={[styles.stateText, isInTransit ? styles.stateTextTransit : { color: STATE_COLORS[service.estado] }]}>
                          {formatStatusLabel(service.estado).replace(' ', '\n')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {service.estado === 'EN_TRANSITO' ? (
                    <Text style={styles.inTransitServiceNumber}>Servicio #{service.numeroServicio}</Text>
                  ) : null}
                  <Text style={styles.routeLabel}>Fecha:
                  <Text style={styles.dateText}>{formatDateTime(service.fechaServicio)}</Text></Text>
                  <Text style={styles.routeLabel}>Origen</Text>
                  <Text style={styles.routeValue}>{service.origenDireccion}</Text>
                  <Text style={styles.routeLabel}>Destino</Text>
                  <Text style={styles.routeValue}>{service.destinoDireccion}</Text>

                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => openPhones(service)} style={styles.actionCircleWrap}>
                      <View style={[styles.actionCircle, styles.actionButtonPhone]}>
                        <MaterialCommunityIcons color="#ffffff" name="phone" size={24} />
                      </View>
                      <Text style={styles.actionText}>Telefonos</Text>
                    </Pressable>
                    <Pressable onPress={() => openExternalUrl(buildMapUrl(service, 'google'))} style={styles.actionCircleWrap}>
                      <View style={[styles.actionCircle, styles.actionButtonMaps]}>
                        <MaterialCommunityIcons color="#ffffff" name="google-maps" size={24} />
                      </View>
                      <Text style={styles.actionText}>
                        {goToDestination ? 'Ir a destino' : 'Ir a origen'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => openExternalUrl(buildMapUrl(service, 'waze'))} style={styles.actionCircleWrap}>
                      <View style={[styles.actionCircle, styles.actionButtonWaze]}>
                        <FontAwesome5 color="#ffffff" name="waze" size={22} brand />
                      </View>
                      <Text style={styles.actionText}>
                        {goToDestination ? 'Ir a destino' : 'Ir a origen'}
                      </Text>
                    </Pressable>
                  </View>

                  {!isBlocked && (
                    <View style={styles.opsRow}>
                      {service.estado === 'ASIGNADA' && (
                        <Pressable
                          onPress={() => { setModalConfig({ type: 'origin', serviceNumber: service.numeroServicio }); setCodeInput(''); }}
                          style={[styles.opsButton, styles.opsButtonPrimary]}
                        >
                          <Text style={styles.opsButtonText}>LLEGUÉ AL ORIGEN</Text>
                        </Pressable>
                      )}

                      {service.estado === 'EN_TRANSITO' && (
                        <Pressable
                          onPress={() => setDestinationConfirmService(service)}
                          style={[styles.opsButton, styles.opsButtonTransitPressable]}
                        >
                          <LinearGradient
                            colors={['#ff8a3d', '#ff6b2c', '#ea4f16']}
                            end={{ x: 1, y: 0.5 }}
                            start={{ x: 0, y: 0.5 }}
                            style={styles.opsButtonTransit}
                          >
                            <Text style={styles.opsButtonText}>LLEGUÉ AL DESTINO</Text>
                          </LinearGradient>
                        </Pressable>
                      )}

                      {service.estado === 'TERMINADO' && (
                        <Pressable
                          onPress={() => navigation.navigate('ServicioDetalle', { serviceNumber: service.numeroServicio })}
                          style={[styles.opsButton, styles.opsButtonSuccess]}
                        >
                          <Text style={styles.opsButtonText}>ENTREGAR SERVICIO</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {isBlocked && service.estado === 'ASIGNADA' && (
                    <Text style={styles.blockedText}>Hay un servicio activo. Finaliza ese primero.</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </RoleGate>
      </ScrollView>

      {/* FAB flotante para subir al inicio */}
      {showScrollTop ? (
        <Pressable
          accessibilityLabel="Subir al inicio"
          accessibilityRole="button"
          onPress={scrollToTop}
          style={({ pressed }) => [
            styles.scrollTopFab,
            pressed && styles.scrollTopFabPressed,
          ]}
        >
          <MaterialCommunityIcons color="#FFFFFF" name="chevron-up" size={26} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screenRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },

  content: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: 0,
    padding: 0,
    paddingTop: 0,
  },

  listContainer: {
    gap: spacing.sm,
    paddingHorizontal: CARD_MARGIN,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  themeToggle: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

  // ─── Banners ──────────────────────────────────────────────
  activeBanner: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activeText: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Service Card ─────────────────────────────────────────
  serviceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    gap: spacing.xs,
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: spacing.md,
    shadowColor: '#0b2239',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  serviceCardInTransit: {
    backgroundColor: colors.blueSoft,
  },
  serviceCardFinished: {
    backgroundColor: colors.neutralSoft,
  },

  // ─── Info Row (Contrato + Estado) ─────────────────────────
  infoRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  infoCol: {
    alignItems: 'center',
    gap: 1,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  contractWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  contractText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '800',
  },
  inTransitServiceNumber: {
    color: colors.info,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 11,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statePill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statePillTransit: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateTextTransit: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  routeLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  routeValue: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 26,
  },

  // ─── Acciones externas (Phone / Maps / Waze) ──────────────
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: spacing.md,
  },
  actionCircleWrap: {
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 5,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  actionButtonPhone: {
    backgroundColor: '#48b749',
  },
  actionButtonMaps: {
    backgroundColor: '#ff6424',
  },
  actionButtonWaze: {
    backgroundColor: '#169cf3',
  },
  actionText: {
    color: colors.textStrong,
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Acciones operativas ─────────────────────────────────
  opsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  opsButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: spacing.md,
  },
  opsButtonPrimary: {
    backgroundColor: colors.info,
  },
  opsButtonTransit: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    width: '100%',
  },
  opsButtonTransitPressable: {
    borderRadius: 14,
    flex: 1,
    overflow: 'hidden',
  },
  opsButtonSuccess: {
    backgroundColor: colors.blue,
  },
  opsButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  blockedText: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },

  // ─── Modales ──────────────────────────────────────────────
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: {
    color: colors.textStrong,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textStrong,
    fontSize: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalList: {
    gap: spacing.sm,
  },
  modalBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  modalSingleActionBtn: {
    alignSelf: 'stretch',
    flex: 0,
  },
  modalBtnCancel: {
    backgroundColor: colors.surfaceAlt,
  },
  modalBtnConfirm: {
    backgroundColor: colors.blue,
  },
  modalBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnConfirmText: {
    color: colors.textStrong,
  },
  modalBtnLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },

  // ─── FAB subir al inicio ─────────────────────────────────
  scrollTopFab: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 28,
    bottom: 88,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    width: 56,
  },
  scrollTopFabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
});
}