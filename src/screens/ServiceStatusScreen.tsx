import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

const conductorRules = [
  'Solo puede existir un servicio activo en EN_TRANSITO o TERMINADO.',
  'Llegue al origen requiere validar que el codigo sea igual al numero de servicio.',
  'Entregar servicio debe capturar una Guiacontrol numerica entre 1 y 10 digitos.',
];

export function ServiceStatusScreen() {
  const { activeService, statusCounts } = useSession();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['CONDUCTOR']}>
        <SectionCard
          title="Estado operativo"
          subtitle="Resumen rapido para validar carga, servicio activo y reglas del flujo conductor."
        >
          <View style={styles.statsGrid}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <View key={status} style={styles.statCard}>
                <Text style={styles.statValue}>{count}</Text>
                <Text style={styles.statLabel}>{status}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Servicio activo"
          subtitle={
            activeService
              ? 'Este servicio debe mantener el foco del flujo operativo actual.'
              : 'No hay un servicio activo en este momento.'
          }
        >
          {activeService ? (
            <View style={styles.activeCard}>
              <Text style={styles.activeTitle}>#{activeService.numeroServicio}</Text>
              <Text style={styles.activeRoute}>{activeService.origenDireccion}</Text>
              <Text style={styles.separator}>a</Text>
              <Text style={styles.activeRoute}>{activeService.destinoDireccion}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Todos los servicios estan inactivos o ya completados.</Text>
          )}
        </SectionCard>

        <SectionCard title="Reglas del flujo" subtitle="Checklist minimo antes de conectar backend real.">
          {conductorRules.map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </SectionCard>
      </RoleGate>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    minWidth: '30%',
    padding: spacing.md,
  },
  statValue: {
    color: colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  activeCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activeTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  activeRoute: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  separator: {
    color: colors.muted,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ruleDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  ruleText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});