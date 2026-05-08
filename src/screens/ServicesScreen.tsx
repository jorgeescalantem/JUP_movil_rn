import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RoleGate } from '../components/RoleGate';
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

type ModalConfig =
  | { type: 'origin'; serviceNumber: string }
  | { type: 'deliver'; serviceNumber: string }
  | null;

export function ServicesScreen() {
  const { services, activeService, arrivedAtOrigin, arrivedAtDestination, deliverService } = useSession();
  const [modalConfig, setModalConfig] = useState<ModalConfig>(null);
  const [codeInput, setCodeInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const orderedServices = [...services].sort(
    (a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime(),
  );

  const openExternalUrl = async (url: string) => {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert('No disponible', 'No se pudo abrir la accion solicitada.');
      return;
    }

    await Linking.openURL(url);
  };

  const openPhones = (service: Service) => {
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

  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 450);
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
      Alert.alert('No fue posible continuar', result.message ?? 'Intenta nuevamente.');
      return;
    }

    setModalConfig(null);
    setCodeInput('');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
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

        <SectionCard
          title="Servicios"
          subtitle="Asignados del mas proximo al mas lejano con accesos rapidos hacia paciente y origen."
        >
          {activeService ? (
            <View style={styles.activeBanner}>
              <Text style={styles.activeLabel}>Servicio activo</Text>
              <Text style={styles.activeText}>
                #{activeService.numeroServicio} — {activeService.estado}
              </Text>
            </View>
          ) : null}

          {orderedServices.map((service) => {
            const isActive = service.estado === 'EN_TRANSITO' || service.estado === 'TERMINADO';
            const isBlocked = !!activeService && activeService.numeroServicio !== service.numeroServicio;

            return (
              <View
                key={service.numeroServicio}
                style={[styles.serviceCard, isActive ? styles.serviceCardActive : null]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.contractWrap}>
                    <MaterialCommunityIcons color="#0fa0f3" name="file-document-outline" size={18} />
                    <Text style={styles.contractText}>{service.contrato}</Text>
                  </View>
                  <View style={[styles.statePill, { backgroundColor: STATE_COLORS[service.estado] + '22' }]}>
                    <Text style={[styles.stateText, { color: STATE_COLORS[service.estado] }]}>
                      {service.estado}
                    </Text>
                  </View>
                </View>

                <Text style={styles.companyText}>{service.companiaNombre}</Text>
                <Text style={styles.dateText}>{formatDateTime(service.fechaServicio)}</Text>
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
                        onPress={() => {
                          Alert.alert(
                            'Llegue al destino',
                            `¿Confirmas que llegaste al destino del servicio #${service.numeroServicio}?`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Confirmar',
                                onPress: () => {
                                  const result = arrivedAtDestination(service.numeroServicio);
                                  if (!result.ok) {
                                    Alert.alert('Error', result.message ?? 'Intenta nuevamente.');
                                  }
                                },
                              },
                            ],
                          );
                        }}
                        style={[styles.opsButton, styles.opsButtonPrimary]}
                      >
                        <Text style={styles.opsButtonText}>Llegue al destino</Text>
                      </Pressable>
                    )}

                    {service.estado === 'TERMINADO' && (
                      <Pressable
                        onPress={() => { setModalConfig({ type: 'deliver', serviceNumber: service.numeroServicio }); setCodeInput(''); }}
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
              </View>
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
  serviceCardActive: {
    backgroundColor: '#2e95e6',
    borderColor: '#2e95e6',
    borderWidth: 1,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contractWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  contractText: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '800',
  },
  companyText: {
    color: '#006493',
    fontSize: 17,
    fontWeight: '800',
  },
  dateText: {
    color: '#41535c',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statePill: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeLabel: {
    color: '#7c8f99',
    fontSize: 14,
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
  modalBtn: {
    borderRadius: 14,
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
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
    color: colors.background,
  },
});