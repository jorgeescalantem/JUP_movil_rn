import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

type Props = DrawerScreenProps<DrawerParamList, 'PropietarioHome'>;

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
}

function currency(value: number) {
  return `$ ${value.toLocaleString('es-CO')}`;
}

export function PropietarioHomeScreen({ navigation }: Props) {
  const { services } = useSession();

  const monthRange = currentMonthRange();

  const monthServices = useMemo(() => {
    return services.filter((service) => {
      if (service.estado !== 'COMPLETADO' && service.estado !== 'procesado') return false;
      const serviceDate = toInputDate(service.fechaServicio);
      return serviceDate >= monthRange.from && serviceDate <= monthRange.to;
    });
  }, [monthRange.from, monthRange.to, services]);

  const totals = monthServices.reduce(
    (acc, service) => ({
      count: acc.count + 1,
      totalValue: acc.totalValue + service.valor,
      totalCopago: acc.totalCopago + service.copago,
    }),
    { count: 0, totalValue: 0, totalCopago: 0 },
  );

  const handleOpenMonthSummary = () => {
    navigation.navigate('ServiciosPrestados', {
      fromDate: monthRange.from,
      toDate: monthRange.to,
      autoApply: true,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['PROPIETARIO']}>
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>Propietario</Text>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Tarjeta Resumen del mes — tap navega a ServiciosPrestados con autosearch */}
        <Pressable onPress={handleOpenMonthSummary} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryEyebrow}>Mes actual</Text>
            <Text style={styles.summaryTap}>Ver detalle →</Text>
          </View>

          <Text style={styles.summaryTitle}>Resumen del mes</Text>
          <Text style={styles.summaryRange}>
            {monthRange.from} — {monthRange.to}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{totals.count}</Text>
              <Text style={styles.metricLabel}>Servicios</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{currency(totals.totalValue)}</Text>
              <Text style={styles.metricLabel}>Valor</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{currency(totals.totalCopago)}</Text>
              <Text style={styles.metricLabel}>Copago</Text>
            </View>
          </View>
        </Pressable>

        {/* Accesos directos */}
        <SectionCard title="Accesos rapidos" subtitle="Navega directamente a las secciones del propietario.">
          <View style={styles.shortcutsGrid}>
            <Pressable onPress={() => navigation.navigate('Cierres')} style={styles.shortcut}>
              <Text style={styles.shortcutTitle}>Cierres</Text>
              <Text style={styles.shortcutDesc}>Terminados vs completados + captura Guiacontrol</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('ServiciosPrestados', {})}
              style={styles.shortcut}
            >
              <Text style={styles.shortcutTitle}>Servicios prestados</Text>
              <Text style={styles.shortcutDesc}>Historial completo con filtros y totales</Text>
            </Pressable>
          </View>
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
  greeting: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textStrong,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  // Tarjeta resumen
  summaryCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryTap: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryTitle: {
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryRange: {
    color: colors.muted,
    fontSize: 13,
  },
  metricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metricDivider: {
    backgroundColor: colors.border,
    height: 40,
    width: 1,
  },
  // Accesos rapidos
  shortcutsGrid: {
    gap: spacing.sm,
  },
  shortcut: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  shortcutTitle: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  shortcutDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
