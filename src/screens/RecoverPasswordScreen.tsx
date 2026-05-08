import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type RecoverPasswordScreenProps = {
  onBack: () => void;
};

export function RecoverPasswordScreen({ onBack }: RecoverPasswordScreenProps) {
  const [documentNumber, setDocumentNumber] = useState('');

  const onRequest = () => {
    if (!documentNumber.trim()) {
      Alert.alert('Dato requerido', 'Ingresa el numero de documento.');
      return;
    }

    Alert.alert(
      'Solicitud enviada',
      'La contrasena se enviara al correo electronico asociado al numero de documento.',
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons color="#121417" name="arrow-left" size={30} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color="#ffffff" name="shield-lock-outline" size={64} />
        </View>

        <Text style={styles.description}>
          La contrasena se enviara a la direccion de correo electronico asociada al numero de documento
        </Text>

        <Text style={styles.inputLabel}>Nro Documento</Text>

        <View style={styles.inputRow}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDocumentNumber}
            placeholder="Ingresa documento"
            placeholderTextColor="#8b9599"
            style={styles.input}
            value={documentNumber}
          />
          <MaterialCommunityIcons color="#39a948" name="check-circle-outline" size={44} />
        </View>

        <View style={styles.separator} />

        <Pressable onPress={onRequest} style={styles.submitButton}>
          <LinearGradient
            colors={['#2fdeb0', '#1bbbe8', '#0fa0f3']}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={styles.submitGradient}
          >
            <MaterialCommunityIcons color="#f8fffe" name="check" size={24} />
            <Text style={styles.submitText}>Solicitar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8f9fa',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 36,
  },
  backButton: {
    padding: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d6dfe0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 132,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#067082',
    borderRadius: 999,
    height: 120,
    justifyContent: 'center',
    marginBottom: 22,
    width: 120,
  },
  description: {
    color: '#6d7579',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#8b9599',
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
    color: '#7b858a',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  separator: {
    backgroundColor: '#d6dfe0',
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
    color: '#f8fffe',
    fontSize: 16,
    fontWeight: '700',
  },
});
