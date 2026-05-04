import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

const nextSteps = [
  'Crear componentes reutilizables en src/components.',
  'Conectar la primera API o fuente de datos.',
  'Agregar navegacion cuando exista mas de una pantalla.',
];

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>JUP movil</Text>
        <Text style={styles.title}>Base limpia para empezar a construir.</Text>
        <Text style={styles.description}>
          El proyecto ya quedo listo para trabajar sobre una sola app Expo con una estructura
          inicial mas clara.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checklist inicial</Text>
        {nextSteps.map((step) => (
          <View key={step} style={styles.row}>
            <View style={styles.bullet} />
            <Text style={styles.step}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  description: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  step: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});