import { MutableRefObject } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

import { serviceDetailModalStyles as styles, signatureWebStyle } from './serviceDetailModals.styles';

type DeliverySignatureModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  serviceNumber: string;
  guideControl: string;
  onChangeGuideControl: (value: string) => void;
  deliveryError: string | null;
  onExpandFullScreen: () => void;
  onClearSignature: () => void;
  isDeliveryModalReady: boolean;
  deliverySignatureMountKey: number;
  signatureData: string | null;
  signatureRef: MutableRefObject<any>;
  onSignatureEnd: () => void;
  onSignatureEmpty: () => void;
  onSignatureLoadEnd: () => void;
  onSignatureOk: (signature: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeliverySignatureModal({
  visible,
  onRequestClose,
  serviceNumber,
  guideControl,
  onChangeGuideControl,
  deliveryError,
  onExpandFullScreen,
  onClearSignature,
  isDeliveryModalReady,
  deliverySignatureMountKey,
  signatureData,
  signatureRef,
  onSignatureEnd,
  onSignatureEmpty,
  onSignatureLoadEnd,
  onSignatureOk,
  onCancel,
  onConfirm,
}: DeliverySignatureModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCardLarge}>
          <Text style={styles.dialogTitle}>Completar servicio</Text>

          <TextInput
            keyboardType="number-pad"
            onChangeText={onChangeGuideControl}
            placeholder={`GuíaControl  ${serviceNumber}`}
            placeholderTextColor="#7b8791"
            style={styles.dialogInput}
            value={guideControl}
          />

          <View style={styles.signatureHeaderRow}>
            <Text style={styles.signatureLabel}>Firma del cliente</Text>
            <View style={styles.signatureHeaderActions}>
              <Pressable onPress={onExpandFullScreen} style={styles.signatureExpandButton}>
                <Text style={styles.signatureExpandText}>Pantalla completa</Text>
              </Pressable>
              <Pressable onPress={onClearSignature} style={styles.signatureClearButton}>
                <Text style={styles.signatureClearText}>Limpiar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.signaturePad}>
            {isDeliveryModalReady ? (
              <SignatureScreen
                autoClear={false}
                bgHeight={280}
                bgWidth={undefined}
                clearText=""
                confirmText=""
                dataURL={signatureData ?? undefined}
                descriptionText=""
                imageType="image/png"
                key={`sig-${deliverySignatureMountKey}`}
                onEnd={onSignatureEnd}
                onEmpty={onSignatureEmpty}
                onLoadEnd={onSignatureLoadEnd}
                onOK={onSignatureOk}
                penColor="#0f172a"
                ref={signatureRef}
                webStyle={signatureWebStyle}
              />
            ) : null}
          </View>

          {deliveryError ? <Text style={styles.dialogError}>{deliveryError}</Text> : null}

          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={[styles.dialogButton, styles.dialogCancelButton]}>
              <Text style={styles.dialogCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.dialogButton, styles.dialogConfirmButton, styles.dialogConfirmButtonWide]}
            >
              <Text style={styles.dialogConfirmText}>Confirmar entrega</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
