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
      <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO']}>
        <View style={styles.headerBlock}>
          <Text style={styles.headerEyebrow}>JUP-movil Version</Text>
          <Text style={styles.headerTitle}>Estado de Servicios</Text>
          <Text style={styles.headerSubtitle}>Vista operativa con el mismo lenguaje visual del login.</Text>
        </View>

        <SectionCard
          title="Estado operativo"
          subtitle="Resumen rapido para validar carga, servicio activo y reglas del flujo conductor."
        >
          <View style={styles.statsGrid}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <View key={status} style={styles.statCard}>
                <Text style={styles.statValue}>{count}</Text>
                <Text style={styles.statLabel}>{status.replace('_', ' ')}</Text>
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
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  headerEyebrow: {
    color: '#006493',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#121417',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#3b4a42',
    fontSize: 14,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: '#f3f4f5',
    borderColor: '#d6e1db',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: '30%',
    padding: spacing.md,
  },
  statValue: {
    color: '#006493',
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    color: '#2f3e36',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  activeCard: {
    backgroundColor: '#f3f4f5',
    borderColor: '#d6e1db',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activeTitle: {
    color: '#006493',
    fontSize: 18,
    fontWeight: '800',
  },
  activeRoute: {
    color: '#191c1d',
    fontSize: 15,
    lineHeight: 22,
  },
  separator: {
    color: '#6b7b72',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#3b4a42',
    fontSize: 15,
    lineHeight: 22,
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ruleDot: {
    backgroundColor: '#00affe',
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  ruleText: {
    color: '#191c1d',
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});