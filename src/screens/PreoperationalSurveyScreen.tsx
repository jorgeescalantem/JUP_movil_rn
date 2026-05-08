import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { preoperationalConfig, PreoperationalOption } from '../mocks/preoperational';
import { useSession } from '../store/session';

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

export function PreoperationalSurveyScreen() {
  const { preoperationalQuestions, submitPreoperational } = useSession();
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [mileage, setMileage] = useState('');
  const [observations, setObservations] = useState('');

  const title = useMemo(
    () => `Preoperacional del ${getTodayDisplay()}, Vehiculo: ${preoperationalConfig.vehicleName}`,
    [],
  );

  const setAnswer = (questionId: string, option: PreoperationalOption) => {
    setAnswers((current) => ({ ...current, [questionId]: option }));
  };

  const onSubmit = () => {
    const result = submitPreoperational({ answers, mileage, observations });

    if (!result.ok) {
      Alert.alert('Encuesta incompleta', result.message ?? 'Completa la encuesta antes de enviar.');
      return;
    }

    Alert.alert('Encuesta enviada', 'Inspeccion preoperacional registrada correctamente.');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Preoperacional</Text>
        <MaterialCommunityIcons color="#1aa8ef" name="send" size={30} />
      </View>

      <Text style={styles.headerText}>{title}</Text>

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
          placeholderTextColor="#8c989b"
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
          placeholderTextColor="#8c989b"
          style={[styles.freeInput, styles.observationsInput]}
          value={observations}
        />
        <View style={styles.bottomLine}>
          <Text style={styles.counter}>{`${observations.length}/69`}</Text>
        </View>
      </View>

      <Pressable onPress={onSubmit} style={styles.submitButton}>
        <LinearGradient
          colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.submitGradient}
        >
          <MaterialCommunityIcons color="#f8fffe" name="send" size={24} />
          <Text style={styles.submitText}>Enviar</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#f8f9fa',
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
    color: '#121417',
    fontSize: 24,
    fontWeight: '900',
  },
  headerText: {
    color: '#1aa8ef',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#b7d9ef',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  questionText: {
    color: '#161a1d',
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
    borderColor: '#2f9be0',
    borderRadius: 999,
    borderWidth: 3,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  radioOuterSelected: {
    borderColor: '#0fa0f3',
  },
  radioInner: {
    backgroundColor: '#0fa0f3',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  optionLabel: {
    color: '#161a1d',
    fontSize: 14,
    fontWeight: '800',
  },
  freeInput: {
    color: '#1b2328',
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
    borderTopColor: '#8f9ba0',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  counter: {
    color: '#5f6b70',
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
    color: '#f8fffe',
    fontSize: 18,
    fontWeight: '700',
  },
});
