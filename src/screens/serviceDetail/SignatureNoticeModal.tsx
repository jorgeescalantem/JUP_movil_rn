import { Modal, Pressable, Text, View } from 'react-native';

import { serviceDetailModalStyles as styles } from './serviceDetailModals.styles';

type SignatureNoticeModalProps = {
  visible: boolean;
  onAccept: () => void;
};

// Shown right after the satisfaction survey, before the signature screen -
// same look as the post-delivery feedback dialog in ServiceDetailScreen.
export function SignatureNoticeModal({ visible, onAccept }: SignatureNoticeModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onAccept} transparent visible={visible}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCardLarge}>
          <Text style={styles.dialogTitle}>Firma del cliente</Text>
          <Text style={styles.dialogSubtitle}>
            Al firmar, usted acepta a satisfacción el servicio de transporte prestado. Esta firma electrónica tiene validez legal conforme a la Ley 527 de 1999 y se usará como soporte de trazabilidad, control HSEQ y respaldo jurídico.
          </Text>

          <Pressable
            onPress={onAccept}
            style={[styles.dialogButton, styles.dialogConfirmButton, styles.dialogSingleActionButton]}
          >
            <Text style={styles.dialogConfirmText}>Firmar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
