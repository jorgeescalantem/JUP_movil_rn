import { MutableRefObject } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureScreen from 'react-native-signature-canvas';

import {
  serviceDetailModalStyles as styles,
  signatureWebStyleFull,
} from './serviceDetailModals.styles';

const SCA = {
  navy: '#1B2A4A',
  blue: '#0FA0F3',
} as const;

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
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={visible}
    >
      <View
        style={[
          styles.fullSignatureScreen,
          {
            paddingTop: insets.top,        // 👈 respeta la status bar
            paddingBottom: insets.bottom,  // 👈 respeta el home indicator
          },
        ]}
      >
        {/* ─── Header ─────────────────────────────────────── */}
        <View style={styles.fullSignatureHeader}>
          <Pressable
            accessibilityLabel="Cerrar pantalla completa"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={styles.fullSignatureHeaderBtn}
          >
            <Text style={styles.fullSignatureHeaderBtnText}>Cerrar</Text>
          </Pressable>

          <Text numberOfLines={1} style={styles.fullSignatureHeaderTitle}>
            Firma del cliente
          </Text>

          <Pressable
            accessibilityLabel="Limpiar firma"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClearSignature}
            style={styles.fullSignatureHeaderBtn}
          >
            <Text style={styles.fullSignatureHeaderBtnText}>Limpiar</Text>
          </Pressable>
        </View>

        {/* ─── Canvas card ────────────────────────────────── */}
        <View style={styles.fullSignatureCanvasWrap}>
          {isFullScreenModalReady ? (
            <View style={styles.fullSignatureCanvasInner}>
              <SignatureScreen
                autoClear={false}
                bgHeight={undefined}
                bgWidth={undefined}
                clearText=""
                confirmText=""
                dataURL={signatureData ?? undefined}
                descriptionText=""
                imageType="image/png"
                key={`sig-full-${fullScreenSignatureMountKey}`}
                onEnd={onSignatureEnd}
                onEmpty={onSignatureEmpty}
                onOK={onSignatureOk}
                penColor={SCA.navy}
                ref={signatureFullScreenRef}
                webStyle={signatureWebStyleFull}
              />
            </View>
          ) : null}
        </View>

        {/* ─── Footer ─────────────────────────────────────── */}
        <View style={styles.fullSignatureFooter}>
          <Pressable
            accessibilityLabel="Usar firma"
            accessibilityRole="button"
            onPress={onUseSignature}
            style={({ pressed }) => [
              styles.fullSignatureUseBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.fullSignatureUseBtnText}>Usar firma</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}