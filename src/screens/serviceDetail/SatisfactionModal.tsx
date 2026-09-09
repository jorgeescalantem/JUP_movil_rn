import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { serviceDetailModalStyles as styles } from './serviceDetailModals.styles';

export const SATISFACTION_LEVELS = [
  { value: 5, label: 'EXCELENTE', color: '#16a34a', emoji: '😄' },
  { value: 4, label: 'BUENO', color: '#84cc16', emoji: '🙂' },
  { value: 3, label: 'REGULAR', color: '#eab308', emoji: '😐' },
  { value: 2, label: 'MALO', color: '#f97316', emoji: '🙁' },
  { value: 1, label: 'PESIMO', color: '#ba1a1a', emoji: '😞' },
] as const;

type SatisfactionModalProps = {
  visible: boolean;
  satisfactionLevel: number | null;
  satisfactionComment: string;
  satisfactionError: string | null;
  onSelectLevel: (value: number) => void;
  onChangeComment: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function SatisfactionModal({
  visible,
  satisfactionLevel,
  satisfactionComment,
  satisfactionError,
  onSelectLevel,
  onChangeComment,
  onClose,
  onConfirm,
}: SatisfactionModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCardLarge}>
          <Text style={styles.dialogTitle}>Calificá Nuestro Servicio</Text>
          <Text style={styles.dialogSubtitle}>
            Antes de firmar, indica el nivel de satisfaccion con el servicio prestado.
          </Text>

          <View style={styles.satisfactionRow}>
            <View style={styles.satisfactionGauge}>
              {SATISFACTION_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  onPress={() => onSelectLevel(level.value)}
                  style={[
                    styles.satisfactionSegment,
                    { backgroundColor: level.color },
                    satisfactionLevel === level.value ? styles.satisfactionSegmentActive : null,
                  ]}
                >
                  {satisfactionLevel === level.value ? (
                    <MaterialCommunityIcons color="#ffffff" name="check-bold" size={18} />
                  ) : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.satisfactionLabelWrap}>
              {satisfactionLevel ? (
                <>
                  <Text style={styles.satisfactionEmoji}>
                    {SATISFACTION_LEVELS.find((l) => l.value === satisfactionLevel)?.emoji}
                  </Text>
                  <Text
                    style={[
                      styles.satisfactionLabel,
                      { color: SATISFACTION_LEVELS.find((l) => l.value === satisfactionLevel)?.color },
                    ]}
                  >
                    {SATISFACTION_LEVELS.find((l) => l.value === satisfactionLevel)?.label}
                  </Text>
                </>
              ) : (
                <Text style={styles.satisfactionPlaceholder}>Toca un nivel</Text>
              )}
            </View>
          </View>

          {satisfactionError ? <Text style={styles.dialogError}>{satisfactionError}</Text> : null}

          <Text style={styles.dialogInputLabelHint}>Observaciones, comentarios o felicitaciones (opcional)</Text>
          <TextInput
            maxLength={350}
            multiline
            numberOfLines={4}
            onChangeText={onChangeComment}
            placeholder="Escribe aqui..."
            placeholderTextColor="#7b8791"
            style={[styles.dialogInput, styles.satisfactionCommentInput]}
            value={satisfactionComment}
          />
          <Text style={styles.satisfactionCounter}>{`${satisfactionComment.length}/350`}</Text>

          <View style={styles.dialogActions}>
            <Pressable onPress={onClose} style={[styles.dialogButton, styles.dialogCancelButton]}>
              <Text style={styles.dialogCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.dialogButton, styles.dialogConfirmButton]}>
              <Text style={styles.dialogConfirmText}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
