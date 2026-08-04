import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type ConnectionErrorScreenProps = {
  message?: string;
  onRetry: () => void;
};

export function ConnectionErrorScreen({ message, onRetry }: ConnectionErrorScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <MaterialCommunityIcons color={colors.danger} name="wifi-off" size={56} />
        <Text style={styles.title}>Sin conexion con el servidor</Text>
        <Text style={styles.message}>
          {message ?? 'No fue posible establecer conexion. Verifica tu internet e intenta nuevamente.'}
        </Text>
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  title: {
    color: colors.textStrong,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
