import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
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

type RegisterScreenProps = {
  onBack: () => void;
};

export function RegisterScreen({ onBack }: RegisterScreenProps) {
  const [documentNumber, setDocumentNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const mobileToken = useMemo(() => '8f4399365f3044a0', []);

  const onRequestAccess = () => {
    if (!documentNumber.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Completa numero documento, usuario y contrasena.');
      return;
    }

    Alert.alert('Solicitud enviada', 'Tu solicitud de acceso fue registrada.');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons color="#121417" name="arrow-left" size={30} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SOLICITAR ACCESO</Text>

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color="#3b4a42" name="pound" size={30} />
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDocumentNumber}
            placeholder="Numero Documento"
            placeholderTextColor="#3b4a42"
            style={styles.fieldInput}
            value={documentNumber}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color="#3b4a42" name="account-outline" size={30} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="Nombre de Usuario"
            placeholderTextColor="#3b4a42"
            style={styles.fieldInput}
            value={username}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color="#3b4a42" name="lock-outline" size={30} />
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor="#3b4a42"
            secureTextEntry
            style={styles.fieldInput}
            value={password}
          />
        </View>
        <View style={styles.separator} />

        <View style={styles.fieldRow}>
          <MaterialCommunityIcons color="#3b4a42" name="cellphone-key" size={30} />
          <View style={styles.tokenWrap}>
            <Text style={styles.tokenLabel}>Mobil Token</Text>
            <Text style={styles.tokenValue}>{mobileToken}</Text>
          </View>
        </View>
        <View style={styles.separator} />

        <Pressable onPress={onRequestAccess} style={styles.submitButton}>
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

        <Pressable onPress={onBack} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>

        <Pressable
          onPress={() => Alert.alert('Politica de privacidad', 'Disponible en nuestra pagina web.')}
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
    gap: 14,
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
  cardTitle: {
    color: '#121417',
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
    color: '#121417',
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  separator: {
    backgroundColor: '#8f9ba0',
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
    color: '#2f3e36',
    fontSize: 14,
    fontWeight: '600',
  },
  tokenValue: {
    color: '#121417',
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
    color: '#f8fffe',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#ffe8e8',
    borderColor: '#f3b8b8',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  cancelText: {
    color: '#ba1a1a',
    fontSize: 17,
    fontWeight: '700',
  },
  privacyWrap: {
    marginTop: 22,
    paddingHorizontal: 6,
  },
  privacyText: {
    color: '#0b78b3',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
});
