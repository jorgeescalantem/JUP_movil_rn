import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PreoperationalOption } from '../mocks/preoperational';
import { useSession } from '../store/session';
import { useTheme, type ThemeColors } from '../theme';

type AnswersMap = Record<string, PreoperationalOption>;

const optionLabels: { value: PreoperationalOption; label: string }[] = [
  { value: 'SI', label: 'SI' },
  { value: 'NO', label: 'NO' },
  { value: 'NO_APLICA', label: 'NO APLICA' },
];

function getTodayDisplay() {
  return new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type AlertModal = { title: string; message: string; onClose?: () => void } | null;

export function PreoperationalSurveyScreen() {
  const { mobilUser, preoperationalLoadError, preoperationalQuestions, reloadPreoperationalChecklist, submitPreoperational } =
    useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [mileage, setMileage] = useState('');
  const [observations, setObservations] = useState('');
  const [alertModal, setAlertModal] = useState<AlertModal>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => `Preoperacional del ${getTodayDisplay()}, Vehiculo: ${mobilUser?.Placa ?? '-'}`,
    [mobilUser],
  );

  const setAnswer = (questionId: string, option: PreoperationalOption) => {
    setAnswers((current) => ({ ...current, [questionId]: option }));
  };

  const onSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitPreoperational({ answers, mileage, observations });

      if (!result.ok) {
        setAlertModal({ title: 'No se pudo enviar', message: result.message ?? 'Completa la encuesta antes de enviar.' });
        return;
      }

      setAlertModal({
        title: 'Encuesta enviada',
        message: 'Inspeccion preoperacional registrada correctamente.',
        onClose: () => { setAnswers({}); setMileage(''); setObservations(''); },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAlert = () => {
    const cb = alertModal?.onClose;
    setAlertModal(null);
    cb?.();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Modal animationType="fade" onRequestClose={handleCloseAlert} transparent visible={!!alertModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{alertModal?.title}</Text>
            <Text style={styles.modalSubtitle}>{alertModal?.message}</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={handleCloseAlert} style={[styles.modalBtn, styles.modalBtnConfirm, styles.modalSingleActionBtn]}>
                <Text style={[styles.modalBtnText, styles.modalBtnConfirmText]}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Preoperacional</Text>
        <MaterialCommunityIcons color={colors.info} name="send" size={30} />
      </View>

      <Text style={styles.headerText}>{title}</Text>

      {preoperationalLoadError ? (
        <View style={styles.questionCard}>
          <Text style={styles.errorText}>{preoperationalLoadError}</Text>
          <Pressable onPress={reloadPreoperationalChecklist} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : preoperationalQuestions.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.blue} size="large" />
          <Text style={styles.loadingText}>Cargando encuesta preoperacional...</Text>
        </View>
      ) : (
        <>
          {preoperationalQuestions.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionText}>{question.text}</Text>

              <View style={styles.optionsRow}>
                {optionLabels.map((option) => {
                  const isSelected = answers[question.id] === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setAnswer(question.id, option.value)}
                      style={styles.optionButton}
                    >
                      <View style={[styles.radioOuter, isSelected ? styles.radioOuterSelected : null]}>
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>KILOMETRAJE</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={69}
              onChangeText={setMileage}
              placeholder="Ingresa kilometraje"
              placeholderTextColor={colors.muted}
              style={styles.freeInput}
              value={mileage}
            />
            <View style={styles.bottomLine}>
              <Text style={styles.counter}>{`${mileage.length}/69`}</Text>
            </View>
          </View>

          <View style={styles.questionCard}>
            <Text style={styles.questionText}>OBSERVACIONES</Text>
            <TextInput
              maxLength={69}
              multiline
              numberOfLines={3}
              onChangeText={setObservations}
              placeholder="Describe observaciones"
              placeholderTextColor={colors.muted}
              style={[styles.freeInput, styles.observationsInput]}
              value={observations}
            />
            <View style={styles.bottomLine}>
              <Text style={styles.counter}>{`${observations.length}/69`}</Text>
            </View>
          </View>

          <Pressable disabled={isSubmitting} onPress={onSubmit} style={styles.submitButton}>
            <LinearGradient
              colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons color={colors.white} name="send" size={24} />
                  <Text style={styles.submitText}>Enviar</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 26,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  screenTitle: {
    color: colors.textStrong,
    fontSize: 24,
    fontWeight: '900',
  },
  headerText: {
    color: colors.info,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  questionText: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  optionButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.blue,
    borderRadius: 999,
    borderWidth: 3,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioOuterSelected: {
    borderColor: colors.blue,
  },
  radioInner: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  optionLabel: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '800',
  },
  freeInput: {
    color: colors.textStrong,
    fontSize: 16,
    marginTop: 10,
    minHeight: 42,
    paddingVertical: 8,
  },
  observationsInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  bottomLine: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  counter: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    borderRadius: 999,
    marginTop: 4,
    overflow: 'hidden',
  },
  submitGradient: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  submitText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
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
  modalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnConfirmText: {
    color: colors.white,
  },
  modalSingleActionBtn: {
    alignSelf: 'flex-end',
  },
});
}
