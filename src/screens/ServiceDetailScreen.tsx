import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMemo, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

import { DrawerParamList } from '../navigation/AppDrawer';
import { saveFirma, nowInColombiaIso, toRawBase64 } from '../services/firmasApi';
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

const signatureWebStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    height: 100%;
    margin: 0;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
  }
  body, html {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`;

export function ServiceDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { services, arrivedAtOrigin, arrivedAtDestination, deliverService, mobilUser } = useSession();

  const [originDialogOpen, setOriginDialogOpen] = useState(false);
  const [originCode, setOriginCode] = useState('');
  const [originError, setOriginError] = useState<string | null>(null);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [signatureFullScreenOpen, setSignatureFullScreenOpen] = useState(false);
  const [guideControl, setGuideControl] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [deliverySignatureMountKey, setDeliverySignatureMountKey] = useState(0);
  const [fullScreenSignatureMountKey, setFullScreenSignatureMountKey] = useState(0);
  const [isDeliveryModalReady, setIsDeliveryModalReady] = useState(false);
  const [isFullScreenModalReady, setIsFullScreenModalReady] = useState(false);
  const [phonesDialogOpen, setPhonesDialogOpen] = useState(false);
  const [destinationDialogOpen, setDestinationDialogOpen] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<{ title: string; message: string; onClose?: () => void } | null>(
    null,
  );
  const signatureRef = useRef<any>(null);
  const signatureFullScreenRef = useRef<any>(null);

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
      setFeedbackDialog({ title: 'No disponible', message: 'No se pudo abrir la accion solicitada.' });
      return;
    }

    await Linking.openURL(url);
  };

  const openPhones = () => {
    if (service.telefonos.length === 0) {
      setFeedbackDialog({ title: 'Sin telefonos', message: 'Este servicio no tiene telefonos disponibles.' });
      return;
    }

    setPhonesDialogOpen(true);
  };

  const resetDeliveryDialog = () => {
    setDeliveryDialogOpen(false);
    setIsDeliveryModalReady(false);
    setSignatureFullScreenOpen(false);
    setIsFullScreenModalReady(false);
    setGuideControl('');
    setDeliveryError(null);
    setSignatureData(null);
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
    setFeedbackDialog({
      title: 'Codigo correcto',
      message: 'Validacion correcta. El servicio ahora esta en transito.',
    });
  };

  const handleArrivedAtDestination = () => {
    setDestinationDialogOpen(true);
  };

  const confirmArrivedAtDestination = () => {
    const result = arrivedAtDestination(service.numeroServicio);
    setDestinationDialogOpen(false);
    if (!result.ok) {
      setFeedbackDialog({ title: 'No fue posible continuar', message: result.message ?? 'Intenta nuevamente.' });
    }
  };

  const handleConfirmDelivery = () => {
    const trimmedGuideControl = guideControl.trim();
    const effectiveGuideControl = trimmedGuideControl.length > 0 ? trimmedGuideControl : service.numeroServicio;

    if (!/^\d{1,10}$/.test(effectiveGuideControl)) {
      setDeliveryError('Ingresa una GuíaControl numerica entre 1 y 10 digitos.');
      return;
    }

    if (!signatureData) {
      setDeliveryError('La firma del cliente es obligatoria para entregar el servicio.');
      return;
    }

    const result = deliverService(service.numeroServicio, effectiveGuideControl);
    if (!result.ok) {
      setDeliveryError(result.message ?? 'No fue posible entregar el servicio.');
      return;
    }

    // Best-effort: the local delivery flow is already confirmed, so a network
    // failure saving the signature must not block the driver from continuing.
    const timestamp = nowInColombiaIso();
    saveFirma({
      Codservicio: Number(service.numeroServicio),
      Codorden: service.orden,
      Noorden: '',
      Fechaserviciofirma: timestamp,
      Horaserviciofirma: timestamp,
      Placa: mobilUser?.Placa ?? '',
      Conductor: mobilUser?.Conductor ?? 0,
      Firma: toRawBase64(signatureData),
      Firmaguia: null,
      Cordenadasfirma: '',
      Favorito: false,
    }).catch(() => undefined);

    resetDeliveryDialog();
    setFeedbackDialog({
      title: 'Servicio Completado',
      message: `Servicio # ${service.numeroServicio} completado — ${formatDateOnly(service.fechaServicio)}\n Servicio Completado y firmado por el cliente. Fecha/Hora Firma: ${formatDateOnly(timestamp)} ${formatTimeOnly(timestamp)}`,
      onClose: () => navigation.navigate('Servicios'),
    });
  };

  const handleSignatureOk = (signature: string) => {
    setSignatureData(signature);
    if (deliveryError) {
      setDeliveryError(null);
    }
  };

  const handleSignatureEmpty = () => {
    setSignatureData(null);
  };

  const requestSignatureSnapshot = (ref: React.MutableRefObject<any>) => {
    ref.current?.readSignature();
  };

  const closeFullScreenSignature = () => {
    setSignatureFullScreenOpen(false);
    setIsFullScreenModalReady(false);
  };

  const ctaLabel =
    service.estado === 'ASIGNADA'
      ? 'Llegue al origen'
      : service.estado === 'EN_TRANSITO'
        ? 'Llegue al destino'
        : service.estado === 'TERMINADO'
          ? 'Entregar servicio'
          : 'Completado';

  const ctaDisabled = service.estado === 'COMPLETADO' || service.estado === 'procesado';
  const ctaColors: readonly [string, string, ...string[]] = ctaDisabled
    ? ['#8ea1b4', '#7b8fa3']
    : service.estado === 'EN_TRANSITO'
      ? ['#2f8cff', '#1f6feb', '#1454cc']
      : service.estado === 'TERMINADO'
        ? ['#39b86b', '#2fa45d', '#218a4b']
        : ['#ff7b39', '#ff6424', '#f54d14'];

  const handleMainAction = () => {
    if (service.estado === 'ASIGNADA') {
      setOriginDialogOpen(true);
      return;
    }

    if (service.estado === 'EN_TRANSITO') {
      handleArrivedAtDestination();
      return;
    }

    if (service.estado === 'TERMINADO') {
      setDeliverySignatureMountKey((key) => key + 1);
      setDeliveryDialogOpen(true);
    }
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
              Ingresa el codigo del servicio para iniciar el recorrido. El numero de servicio fue enviado al cliente.
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

      <Modal
        animationType="slide"
        onRequestClose={resetDeliveryDialog}
        onShow={() => setIsDeliveryModalReady(true)}
        transparent
        visible={deliveryDialogOpen && !signatureFullScreenOpen}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCardLarge}>
            <Text style={styles.dialogTitle}>Completar servicio</Text>
            <Text style={styles.dialogSubtitle}>
              GuíaControl Cierre: Solicita la firma del
              Paciente para completar el traslado.
            </Text>

            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => {
                setGuideControl(value);
                if (deliveryError) setDeliveryError(null);
              }}
              placeholder={`GuíaControl (opcional, por defecto ${service.numeroServicio})`}
              placeholderTextColor="#7b8791"
              style={styles.dialogInput}
              value={guideControl}
            />

            <View style={styles.signatureHeaderRow}>
              <Text style={styles.signatureLabel}>Firma del cliente</Text>
              <View style={styles.signatureHeaderActions}>
                <Pressable
                  onPress={() => {
                    setFullScreenSignatureMountKey((key) => key + 1);
                    setSignatureFullScreenOpen(true);
                  }}
                  style={styles.signatureExpandButton}
                >
                  <Text style={styles.signatureExpandText}>Pantalla completa</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    signatureRef.current?.clearSignature();
                    signatureFullScreenRef.current?.clearSignature();
                    setSignatureData(null);
                  }}
                  style={styles.signatureClearButton}
                >
                  <Text style={styles.signatureClearText}>Limpiar</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.signaturePad}>
              {isDeliveryModalReady ? (
                <SignatureScreen
                  autoClear={false}
                  bgHeight={220}
                  bgWidth={300}
                  clearText=""
                  confirmText=""
                  dataURL={signatureData ?? undefined}
                  descriptionText=""
                  imageType="image/png"
                  key={`sig-${deliverySignatureMountKey}`}
                  onEnd={() => requestSignatureSnapshot(signatureRef)}
                  onEmpty={handleSignatureEmpty}
                  onOK={handleSignatureOk}
                  penColor="#0f172a"
                  ref={signatureRef}
                  webStyle={signatureWebStyle}
                />
              ) : null}
            </View>

            {deliveryError ? <Text style={styles.dialogError}>{deliveryError}</Text> : null}

            <View style={styles.dialogActions}>
              <Pressable onPress={resetDeliveryDialog} style={[styles.dialogButton, styles.dialogCancelButton]}>
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelivery}
                style={[styles.dialogButton, styles.dialogConfirmButton, styles.dialogConfirmButtonWide]}
              >
                <Text style={styles.dialogConfirmText}>Confirmar entrega</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeFullScreenSignature}
        onShow={() => setIsFullScreenModalReady(true)}
        visible={signatureFullScreenOpen}
      >
        <View style={styles.fullSignatureScreen}>
          <View style={styles.fullSignatureHeader}>
            <Pressable onPress={closeFullScreenSignature} style={styles.fullSignatureHeaderBtn}>
              <Text style={styles.fullSignatureHeaderBtnText}>Cerrar</Text>
            </Pressable>
            <Text style={styles.fullSignatureHeaderTitle}>Firma del cliente</Text>
            <Pressable
              onPress={() => {
                signatureFullScreenRef.current?.clearSignature();
                signatureRef.current?.clearSignature();
                setSignatureData(null);
              }}
              style={styles.fullSignatureHeaderBtn}
            >
              <Text style={styles.fullSignatureHeaderBtnText}>Limpiar</Text>
            </Pressable>
          </View>

          <View style={styles.fullSignatureCanvasWrap}>
            {isFullScreenModalReady ? (
              <SignatureScreen
                autoClear={false}
                clearText=""
                confirmText=""
                dataURL={signatureData ?? undefined}
                descriptionText=""
                imageType="image/png"
                key={`sig-full-${fullScreenSignatureMountKey}`}
                onEnd={() => requestSignatureSnapshot(signatureFullScreenRef)}
                onEmpty={handleSignatureEmpty}
                onOK={handleSignatureOk}
                penColor="#0f172a"
                ref={signatureFullScreenRef}
                webStyle={signatureWebStyle}
              />
            ) : null}
          </View>

          <View style={styles.fullSignatureFooter}>
            <Pressable
              onPress={() => {
                requestSignatureSnapshot(signatureFullScreenRef);
                closeFullScreenSignature();
              }}
              style={styles.fullSignatureUseBtn}
            >
              <Text style={styles.fullSignatureUseBtnText}>Usar firma</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setDestinationDialogOpen(false)}
        transparent
        visible={destinationDialogOpen}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Llegue al destino</Text>
            <Text style={styles.dialogSubtitle}>¿Confirmar la llegada al destino de este servicio?</Text>

            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => setDestinationDialogOpen(false)}
                style={[styles.dialogButton, styles.dialogCancelButton]}
              >
                <Text style={styles.dialogCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={confirmArrivedAtDestination}
                style={[styles.dialogButton, styles.dialogConfirmButton]}
              >
                <Text style={styles.dialogConfirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPhonesDialogOpen(false)}
        transparent
        visible={phonesDialogOpen}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Telefonos disponibles</Text>
            <Text style={styles.dialogSubtitle}>Selecciona un numero para llamar al paciente.</Text>

            <View style={styles.phoneActionsWrap}>
              {service.telefonos.map((phone) => (
                <Pressable
                  key={phone}
                  onPress={() => {
                    setPhonesDialogOpen(false);
                    void openExternalUrl(`tel:${phone}`);
                  }}
                  style={[styles.dialogButton, styles.dialogConfirmButton, styles.dialogSingleActionButton]}
                >
                  <Text style={styles.dialogConfirmText}>{phone}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setPhonesDialogOpen(false)}
              style={[styles.dialogButton, styles.dialogCancelButton, styles.dialogSingleActionButton]}
            >
              <Text style={styles.dialogCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setFeedbackDialog(null)}
        transparent
        visible={!!feedbackDialog}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{feedbackDialog?.title}</Text>
            <Text style={styles.dialogSubtitle}>{feedbackDialog?.message}</Text>

            <Pressable
              onPress={() => {
                const onClose = feedbackDialog?.onClose;
                setFeedbackDialog(null);
                onClose?.();
              }}
              style={[styles.dialogButton, styles.dialogConfirmButton, styles.dialogSingleActionButton]}
            >
              <Text style={styles.dialogConfirmText}>Aceptar</Text>
            </Pressable>
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
          disabled={ctaDisabled}
          onPress={handleMainAction}
          style={styles.detailStatusButtonPressable}
        >
          <LinearGradient
            colors={ctaColors}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.detailStatusButton}
          >
            <MaterialCommunityIcons color="#ffffff" name="arrow-right-bold" size={18} />
            <Text style={styles.detailStatusButtonText}>{ctaLabel}</Text>
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
  detailHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
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
  dialogCardLarge: {
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
  phoneActionsWrap: {
    gap: spacing.xs,
  },
  dialogButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dialogConfirmButtonWide: {
    flex: 1.6,
  },
  dialogSingleActionButton: {
    alignSelf: 'stretch',
    flex: 0,
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
  signatureHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    rowGap: spacing.xs,
  },
  signatureHeaderActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  signatureLabel: {
    color: '#0f172a',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  signatureExpandButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  signatureExpandText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  signatureClearButton: {
    backgroundColor: '#eff3f7',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  signatureClearText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  signaturePad: {
    backgroundColor: '#f8fafc',
    borderColor: '#c8d6e5',
    borderRadius: 12,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
  },
  fullSignatureScreen: {
    backgroundColor: '#eef2f5',
    flex: 1,
  },
  fullSignatureHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  fullSignatureHeaderTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  fullSignatureHeaderBtn: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ec',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  fullSignatureHeaderBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  fullSignatureCanvasWrap: {
    borderTopColor: '#d2d9df',
    borderTopWidth: 1,
    flex: 1,
    marginTop: spacing.xs,
  },
  fullSignatureFooter: {
    backgroundColor: '#eef2f5',
    padding: spacing.lg,
  },
  fullSignatureUseBtn: {
    alignItems: 'center',
    backgroundColor: '#ff6424',
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  fullSignatureUseBtnText: {
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
