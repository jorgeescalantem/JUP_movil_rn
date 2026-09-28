import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MoonStar, SunMedium } from 'lucide-react-native';

import { useSession } from '../store/session';
import { authenticateWithBiometrics, saveBiometricCredentials } from '../services/biometricAuth';
import { useTheme, type ThemeColors } from '../theme';
import { getShortDeviceId } from '../utils/deviceId';

type LoginScreenProps = {
  onOpenRegister?: () => void;
  onOpenRecover?: () => void;
};

type FeedbackModal = { title: string; message: string } | null;

export function LoginScreen({ onOpenRegister, onOpenRecover }: LoginScreenProps) {
  const { login } = useSession();
  const { height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDark, toggle } = useTheme();
  const ThemeIcon = isDark ? SunMedium : MoonStar;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>(null);
  const isCompact = height < 760;

  useEffect(() => {
    getShortDeviceId().then(setDeviceId);
  }, []);

  const onSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await login(username, password);

      if (!result.ok) {
        // Alert.alert is a no-op on react-native-web, so errors must be shown inline.
        setErrorMessage(result.message ?? 'Verifica los datos e intenta nuevamente.');
      } else {
        saveBiometricCredentials(username, password).catch(() => undefined);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBiometricLogin = async (label: 'FaceID' | 'Huella') => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const biometricResult = await authenticateWithBiometrics(`Inicia sesion con ${label}`);

      if (!biometricResult.ok) {
        setFeedbackModal({ title: label, message: biometricResult.message });
        return;
      }

      const result = await login(biometricResult.username, biometricResult.password);

      if (!result.ok) {
        setErrorMessage(result.message ?? 'Verifica los datos e intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <Modal animationType="fade" onRequestClose={() => setFeedbackModal(null)} transparent visible={!!feedbackModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{feedbackModal?.title}</Text>
            <Text style={styles.modalSubtitle}>{feedbackModal?.message}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setFeedbackModal(null)} style={[styles.modalBtn, styles.modalBtnConfirm]}>
                <Text style={styles.modalBtnConfirmText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        <View style={[styles.card, isCompact ? styles.cardCompact : null]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Iniciar Sesion</Text>
            <Pressable
              accessibilityLabel="Cambiar tema"
              hitSlop={8}
              onPress={toggle}
              style={styles.themeToggle}
            >
              <ThemeIcon color={colors.blue} size={20} />
            </Pressable>
          </View>

          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo1.png')} style={styles.logo} />
            <Text style={styles.portalLabel}>JUP-movil Version</Text>
            {deviceId ? (
              <Text selectable style={styles.deviceIdText}>
                ID de dispositivo (soporte): {deviceId}
              </Text>
            ) : null}
          </View>

          <View style={[styles.fieldGroup, isCompact ? styles.fieldGroupCompact : null]}>
            <Text style={styles.label}>Usuario</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
                placeholder="Ingrese su usuario"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={username}
              />
            </View>
          </View>

          <View style={[styles.fieldGroup, isCompact ? styles.fieldGroupCompact : null]}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>Contrasena</Text>
              <Pressable onPress={onOpenRecover}>
                <Text style={styles.forgot}>Olvido su clave?</Text>
              </Pressable>
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>*</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="........"
                placeholderTextColor={colors.muted}
                secureTextEntry={!isPasswordVisible}
                style={styles.input}
                value={password}
              />
              <Pressable onPress={() => setIsPasswordVisible((prev) => !prev)}>
                <Text style={styles.eyeIcon}>{isPasswordVisible ? 'Ocultar' : 'Ver'}</Text>
              </Pressable>
            </View>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            style={[
              styles.submitButton,
              isCompact ? styles.submitButtonCompact : null,
              isSubmitting ? styles.submitButtonDisabled : null,
            ]}
          >
            <LinearGradient
              colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>{isSubmitting ? 'INGRESANDO...' : 'INGRESAR'}</Text>
              {!isSubmitting ? <Text style={styles.arrowIcon}>{'>'}</Text> : null}
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>O INGRESAR CON</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.biometricRow}>
            <Pressable
              onPress={() => onBiometricLogin('FaceID')}
              style={styles.biometricButton}
            >
              <MaterialCommunityIcons color={colors.info} name="face-recognition" size={30} />
              <Text style={styles.biometricText}>FaceID</Text>
            </Pressable>

            <Pressable
              onPress={() => onBiometricLogin('Huella')}
              style={styles.biometricButton}
            >
              <MaterialCommunityIcons color={colors.info} name="fingerprint" size={30} />
              <Text style={styles.biometricText}>Huella</Text>
            </Pressable>
          </View>

          <Text style={styles.supportText}>
            No tiene una cuenta?{' '}
            <Text onPress={onOpenRegister} style={styles.supportLink}>
              Registrarse
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
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
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardCompact: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    color: colors.textStrong,
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  themeToggle: {
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  logo: {
    height: 88,
    resizeMode: 'contain',
    width: 88,
  },
  portalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  deviceIdText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldGroupCompact: {
    gap: 4,
  },
  passwordHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  forgot: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputWrap: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  inputIcon: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    width: 20,
  },
  eyeIcon: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 4,
  },
  submitButtonCompact: {
    marginTop: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  divider: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  biometricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  biometricButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 86,
    justifyContent: 'center',
  },
  biometricText: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  supportText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'center',
  },
  testHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  supportLink: {
    color: colors.info,
    fontWeight: '800',
  },
});
}
