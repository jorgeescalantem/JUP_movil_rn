import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { registerAccount } from '../services/registerApi';
import { useTheme, type ThemeColors } from '../theme';
import { getShortDeviceId } from '../utils/deviceId';

type RegisterScreenProps = {
  onBack: () => void;
};

type FeedbackModal = { title: string; message: string; onClose?: () => void } | null;

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>(null);

  useEffect(() => {
    getShortDeviceId().then(setMobileToken);
  }, []);

  const closeFeedbackModal = () => {
    const onClose = feedbackModal?.onClose;
    setFeedbackModal(null);
    onClose?.();
  };

  const onRequestAccess = async () => {
    if (!documentNumber.trim() || !username.trim() || !password.trim()) {
      setFeedbackModal({ title: 'Campos incompletos', message: 'Completa numero documento, usuario y contrasena.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const registerResult = await registerAccount({ documentNumber, username, password });

      if (!registerResult.ok) {
        setFeedbackModal({ title: 'No fue posible continuar', message: registerResult.message });
        return;
      }

      setFeedbackModal({
        title: 'Cuenta creada',
        message: 'Tu cuenta fue creada correctamente. Ya puedes iniciar sesion.',
        onClose: onBack,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SOLICITAR ACCESO</Text>

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color={colors.muted} name="pound" size={30} />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDocumentNumber}
            placeholder="Numero Documento"
            placeholderTextColor={colors.muted}
            style={styles.fieldInput}
            value={documentNumber}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color={colors.muted} name="account-outline" size={30} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="Nombre de Usuario"
            placeholderTextColor={colors.muted}
            style={styles.fieldInput}
            value={username}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color={colors.muted} name="lock-outline" size={30} />
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.fieldInput}
            value={password}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color={colors.muted} name="cellphone-key" size={30} />
          <View style={styles.tokenWrap}>
            <Text style={styles.tokenLabel}>Mobil Token</Text>
            <Text style={styles.tokenValue}>{mobileToken ?? '...'}</Text>
          </View>
        </View>
        <View style={styles.separator} />

        <Pressable disabled={isSubmitting} onPress={onRequestAccess} style={styles.submitButton}>
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
            <Text style={styles.submitText}>{isSubmitting ? 'Creando cuenta...' : 'Solicitar'}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onBack} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setFeedbackModal({ title: 'Politica de privacidad', message: 'Disponible en nuestra pagina web.' })
          }
          style={styles.privacyWrap}
        >
          <Text style={styles.privacyText}>
            al registrarte aceptas nuestra politica de privacidad disponible en nuestra pagina web
          </Text>
        </Pressable>
      </View>
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
    gap: 14,
    minHeight: 36,
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
  cardTitle: {
    color: colors.textStrong,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    minHeight: 54,
  },
  fieldInput: {
    color: colors.textStrong,
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginBottom: 10,
    marginTop: 4,
    opacity: 0.8,
  },
  tokenWrap: {
    flex: 1,
    gap: 2,
  },
  tokenLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  tokenValue: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  submitButton: {
    borderRadius: 999,
    marginTop: 20,
    overflow: 'hidden',
  },
  submitGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 52,
  },
  submitText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  cancelText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  privacyWrap: {
    marginTop: 22,
    paddingHorizontal: 6,
  },
  privacyText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
});
}
