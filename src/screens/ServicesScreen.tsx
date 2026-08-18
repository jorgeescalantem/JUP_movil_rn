import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

import { RoleGate } from '../components/RoleGate';
import { DrawerParamList } from '../navigation/AppDrawer';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';
import { Service, ServiceState } from '../types/domain';

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function buildMapUrl(service: Service, app: 'google' | 'waze') {
  if (app === 'waze') {
    return `https://waze.com/ul?ll=${service.origenLat},${service.origenLng}&navigate=yes`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${service.origenLat},${service.origenLng}`;
}

const STATE_COLORS: Record<ServiceState, string> = {
  ASIGNADA: colors.warning,
  EN_TRANSITO: colors.info,
  TERMINADO: colors.muted,
  COMPLETADO: colors.accent,
  procesado: colors.accent,
};

function formatStatusLabel(status: ServiceState) {
  if (status === 'ASIGNADA') return 'ASIGNADO';
  return status.replace('_', ' ');
}

type ModalConfig =
  | { type: 'origin'; serviceNumber: string }
  | { type: 'deliver'; serviceNumber: string }
  | null;

export function ServicesScreen() {
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const {
    services,
    activeService,
    arrivedAtOrigin,
    arrivedAtDestination,
    deliverService,
    isLoadingServices,
    servicesLoadError,
    reloadAssignedServices,
  } = useSession();
  const [modalConfig, setModalConfig] = useState<ModalConfig>(null);
  const [codeInput, setCodeInput] = useState('');
  const [phonesDialogService, setPhonesDialogService] = useState<Service | null>(null);
  const [destinationConfirmService, setDestinationConfirmService] = useState<Service | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{ title: string; message: string } | null>(null);

  const visibleServices = Array.from(
    new Map(
      services
        .filter(
          (service) =>
            service.estado === 'ASIGNADA' ||
            service.estado === 'EN_TRANSITO' ||
            service.estado === 'TERMINADO',
        )
        // Defensive de-dupe by numeroServicio: guarantees unique list keys
        // even if upstream state ever contains a duplicate entry.
        .map((service) => [service.numeroServicio, service]),
    ).values(),
  );

  const orderedServices = [...visibleServices].sort(
    (a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime(),
  );

  const openExternalUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      setFeedbackDialog({ title: 'No disponible', message: 'No se pudo abrir la accion solicitada.' });
      return;
    }

    await Linking.openURL(url);
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

  const handleModalConfirm = () => {
    if (!modalConfig) return;

    let result: { ok: boolean; message?: string };

    if (modalConfig.type === 'origin') {
      result = arrivedAtOrigin(modalConfig.serviceNumber, codeInput);
    } else {
      result = deliverService(modalConfig.serviceNumber, codeInput);
    }

    if (!result.ok) {
      setFeedbackDialog({ title: 'No fue posible continuar', message: result.message ?? 'Intenta nuevamente.' });
      return;
    }

    setModalConfig(null);
    setCodeInput('');
  };

  const confirmArrivedAtDestination = () => {
    if (!destinationConfirmService) return;

    const result = arrivedAtDestination(destinationConfirmService.numeroServicio);
    setDestinationConfirmService(null);

    if (!result.ok) {
      setFeedbackDialog({ title: 'No fue posible continuar', message: result.message ?? 'Intenta nuevamente.' });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isLoadingServices} />}
    >
      <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO']}>
        {/* Modal para validaciones con input */}
        <Modal animationType="fade" onRequestClose={() => setModalConfig(null)} transparent visible={!!modalConfig}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {modalConfig?.type === 'origin' ? 'Llegue al origen' : 'Entregar servicio'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {modalConfig?.type === 'origin'
                  ? 'Ingresa el numero de servicio para confirmar tu llegada al origen.'
                  : 'Ingresa la Guiacontrol (solo numeros, 1 a 10 digitos).'}
              </Text>

              <TextInput
                autoFocus
                keyboardType="number-pad"
                onChangeText={setCodeInput}
                placeholder={modalConfig?.type === 'origin' ? 'Numero de servicio' : 'Guiacontrol'}
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
                  <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>Confirmar</Text>
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
                {phonesDialogService?.telefonos.map((phone) => (
                  <Pressable
                    key={phone}
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
              <Text style={styles.modalTitle}>Llegue al destino</Text>
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

        <SectionCard
          title="Servicios"
          subtitle="Asignados del dia."
        >
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

          {orderedServices.map((service) => {
            const isInTransit = service.estado === 'EN_TRANSITO';
            const isFinished = service.estado === 'TERMINADO';
            const isBlocked = !!activeService && activeService.numeroServicio !== service.numeroServicio;

            return (
              <Pressable
                key={`${service.orden}-${service.numeroServicio}`}
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
                      <MaterialCommunityIcons color="#260ff3" name="file-document-outline" size={19} />
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

                {/* Acciones externas: siempre visibles */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => openPhones(service)}
                    style={styles.actionCircleWrap}
                  >
                    <View style={[styles.actionCircle, styles.actionButtonPhone]}>
                      <MaterialCommunityIcons color="#ffffff" name="phone" size={24} />
                    </View>
                    <Text style={styles.actionText}>Telefonos</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openExternalUrl(buildMapUrl(service, 'google'))}
                    style={styles.actionCircleWrap}
                  >
                    <View style={[styles.actionCircle, styles.actionButtonMaps]}>
                      <MaterialCommunityIcons color="#ffffff" name="google-maps" size={24} />
                    </View>
                    <Text style={styles.actionText}>Maps</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openExternalUrl(buildMapUrl(service, 'waze'))}
                    style={styles.actionCircleWrap}
                  >
                    <View style={[styles.actionCircle, styles.actionButtonWaze]}>
                      <FontAwesome5 color="#ffffff" name="waze" size={22} brand />
                    </View>
                    <Text style={styles.actionText}>Waze</Text>
                  </Pressable>
                </View>

                {/* Acciones operativas situacionales */}
                {!isBlocked && (
                  <View style={styles.opsRow}>
                    {service.estado === 'ASIGNADA' && (
                      <Pressable
                        onPress={() => { setModalConfig({ type: 'origin', serviceNumber: service.numeroServicio }); setCodeInput(''); }}
                        style={[styles.opsButton, styles.opsButtonPrimary]}
                      >
                        <Text style={styles.opsButtonText}>Llegue al origen</Text>
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
                          <Text style={styles.opsButtonText}>Llegue al destino</Text>
                        </LinearGradient>
                      </Pressable>
                    )}

                    {service.estado === 'TERMINADO' && (
                      <Pressable
                          onPress={() => navigation.navigate('ServicioDetalle', { serviceNumber: service.numeroServicio })}
                        style={[styles.opsButton, styles.opsButtonSuccess]}
                      >
                        <Text style={styles.opsButtonText}>Entregar servicio</Text>
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
        </SectionCard>
      </RoleGate>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  activeBanner: {
    backgroundColor: '#dff6ea',
    borderColor: '#b8e7cf',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#fdecec',
    borderColor: '#f3b9b9',
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  activeLabel: {
    color: '#12805c',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activeText: {
    color: '#121417',
    fontSize: 15,
    fontWeight: '700',
  },
  serviceCard: {
    backgroundColor: '#f7fafb',
    borderColor: '#d8e5ea',
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    shadowColor: '#0b2239',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  serviceCardInTransit: {
    backgroundColor: '#cfe9ff',
    borderColor: '#5aaeea',
    borderWidth: 1,
  },
  serviceCardFinished: {
    backgroundColor: '#e9eff4',
    borderColor: '#c8d6e2',
    borderWidth: 1,
  },
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
    color: '#7c8f99',
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
    color: '#0b4f7e',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 11,
  },
  dateText: {
    color: '#41535c',
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
    backgroundColor: '#9fd8ff',
    borderColor: '#3f97d8',
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
    color: '#004c7c',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  routeLabel: {
    color: '#7c8f99',
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  routeValue: {
    color: '#161a1d',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 26,
  },
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
    borderColor: '#ffffff',
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
    color: '#1b2328',
    fontSize: 12,
    fontWeight: '700',
  },
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
    backgroundColor: colors.accent,
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
  // Modal
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: '#000000cc',
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
    backgroundColor: colors.accent,
  },
  modalBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnConfirmText: {
    color: '#0b2239',
  },
});