import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
    return `https://waze.com/ul?ll=${service.destinoLat},${service.destinoLng}&navigate=yes`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${service.destinoLat},${service.destinoLng}`;
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
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['CONDUCTOR']}>
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
          title="Servicios del dia"
          subtitle="Vista compacta con fecha, origen, destino y acciones segun el estado actual del servicio."
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
                  <Text style={styles.serviceNumber}>#{service.numeroServicio}</Text>
                  <View style={[styles.statePill, { backgroundColor: STATE_COLORS[service.estado] + '22' }]}>
                    <Text style={[styles.stateText, { color: STATE_COLORS[service.estado] }]}>
                      {service.estado}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dateText}>{formatDateTime(service.fechaServicio)}</Text>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeValue}>{service.origenDireccion}</Text>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeValue}>{service.destinoDireccion}</Text>

                {/* Acciones externas: siempre visibles */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => openExternalUrl(`tel:${service.telefonos[0]}`)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Telefono</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openExternalUrl(buildMapUrl(service, 'google'))}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Google Maps</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openExternalUrl(buildMapUrl(service, 'waze'))}
                    style={styles.actionButton}
                  >
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
    gap: spacing.lg,
    padding: spacing.lg,
  },
  activeBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activeLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activeText: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '600',
  },
  serviceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  serviceCardActive: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceNumber: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
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
  dateText: {
    color: colors.muted,
    fontSize: 13,
  },
  routeLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  routeValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.textStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  opsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  opsButton: {
    borderRadius: 14,
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
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