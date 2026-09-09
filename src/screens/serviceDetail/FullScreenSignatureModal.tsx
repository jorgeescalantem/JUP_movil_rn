import { MutableRefObject } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

import { serviceDetailModalStyles as styles, signatureWebStyle } from './serviceDetailModals.styles';

type FullScreenSignatureModalProps = {
  visible: boolean;
  onClose: () => void;
  onClearSignature: () => void;
  isFullScreenModalReady: boolean;
  fullScreenSignatureMountKey: number;
  signatureData: string | null;
  signatureFullScreenRef: MutableRefObject<any>;
  onSignatureEnd: () => void;
  onSignatureEmpty: () => void;
  onSignatureOk: (signature: string) => void;
  onUseSignature: () => void;
};

export function FullScreenSignatureModal({
  visible,
  onClose,
  onClearSignature,
  isFullScreenModalReady,
  fullScreenSignatureMountKey,
  signatureData,
  signatureFullScreenRef,
  onSignatureEnd,
  onSignatureEmpty,
  onSignatureOk,
  onUseSignature,
}: FullScreenSignatureModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.fullSignatureScreen}>
        <View style={styles.fullSignatureHeader}>
          <Pressable onPress={onClose} style={styles.fullSignatureHeaderBtn}>
            <Text style={styles.fullSignatureHeaderBtnText}>Cerrar</Text>
          </Pressable>
          <Text style={styles.fullSignatureHeaderTitle}>Firma del cliente</Text>
          <Pressable onPress={onClearSignature} style={styles.fullSignatureHeaderBtn}>
            <Text style={styles.fullSignatureHeaderBtnText}>Limpiar</Text>
          </Pressable>
        </View>

        <View style={styles.fullSignatureCanvasWrap}>
          {isFullScreenModalReady ? (
            <SignatureScreen
              autoClear={false}
              bgHeight={220}
              bgWidth={300}
              clearText=""
              confirmText=""
              dataURL={signatureData ?? undefined}
              descriptionText=""
              imageType="image/png"
              key={`sig-full-${fullScreenSignatureMountKey}`}
              onEnd={onSignatureEnd}
              onEmpty={onSignatureEmpty}
              onOK={onSignatureOk}
              penColor="#0f172a"
              ref={signatureFullScreenRef}
              webStyle={signatureWebStyle}
            />
          ) : null}
        </View>

        <View style={styles.fullSignatureFooter}>
          <Pressable onPress={onUseSignature} style={styles.fullSignatureUseBtn}>
            <Text style={styles.fullSignatureUseBtnText}>Usar firma</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
