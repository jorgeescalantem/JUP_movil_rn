import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { recoverPassword } from '../services/recoverApi';
import { useTheme, type ThemeColors } from '../theme';

type RecoverPasswordScreenProps = {
  onBack: () => void;
};

type FeedbackModal = { title: string; message: string; onClose?: () => void } | null;

export function RecoverPasswordScreen({ onBack }: RecoverPasswordScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>(null);

  const closeFeedbackModal = () => {
    const onClose = feedbackModal?.onClose;
    setFeedbackModal(null);
    onClose?.();
  };

  const onRequest = async () => {
    if (!documentNumber.trim() || !email.trim()) {
      setFeedbackModal({ title: 'Datos requeridos', message: 'Ingresa el numero de documento y el correo asociado.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await recoverPassword(documentNumber, email);

      if (!result.ok) {
        setFeedbackModal({ title: 'No fue posible continuar', message: result.message });
        return;
      }

      setFeedbackModal({
        title: 'Correo enviado',
        message: 'Te enviamos una nueva contrasena temporal al correo asociado. Usala para iniciar sesion.',
        onClose: onBack,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
      <Modal animationType="fade" onRequestClose={closeFeedbackModal} transparent visible={!!feedbackModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{feedbackModal?.title}</Text>
            <Text style={styles.modalSubtitle}>{feedbackModal?.message}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={closeFeedbackModal} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                <Text style={styles.modalBtnConfirmText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons color={colors.textStrong} name="arrow-left" size={30} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={colors.white} name="shield-lock-outline" size={64} />
        </View>

        <Text style={styles.description}>
          Verificamos tu documento y correo asociado, y te enviamos una contrasena temporal nueva
        </Text>

        <Text style={styles.inputLabel}>Nro Documento</Text>

        <View style={styles.inputRow}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDocumentNumber}
            placeholder="Ingresa documento"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={documentNumber}
          />
          <MaterialCommunityIcons color={colors.success} name="check-circle-outline" size={44} />
        </View>

        <View style={styles.separator} />

        <Text style={styles.inputLabel}>Correo asociado</Text>

        <View style={styles.inputRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Ingresa tu correo"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />
          <MaterialCommunityIcons color={colors.success} name="email-check-outline" size={44} />
        </View>

        <View style={styles.separator} />

        <Pressable disabled={isSubmitting} onPress={onRequest} style={styles.submitButton}>
          <LinearGradient
            colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <MaterialCommunityIcons color={colors.white} name="check" size={24} />
            )}
            <Text style={styles.submitText}>{isSubmitting ? 'Enviando...' : 'Solicitar'}</Text>
          </LinearGradient>
        </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalBtnConfirm: {
    backgroundColor: colors.blue,
  },
  modalBtnConfirmText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 36,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backButton: {
    padding: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 132,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.info,
    borderRadius: 999,
    height: 120,
    justifyContent: 'center',
    marginBottom: 22,
    width: 120,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 12,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginBottom: 16,
    marginTop: 6,
  },
  submitButton: {
    alignSelf: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 36,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
}
