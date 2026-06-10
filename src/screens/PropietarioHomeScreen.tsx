import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { services, username } = useSession();

  const monthRange = currentMonthRange();

  const monthServices = useMemo(() => {
    return services.filter((service) => {
      if (service.estado !== 'TERMINADO' && service.estado !== 'COMPLETADO') return false;
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

  const terminatedCount = useMemo(
    () => services.filter((service) => service.estado === 'TERMINADO').length,
    [services],
  );
  const completedCount = useMemo(
    () => services.filter((service) => service.estado === 'COMPLETADO').length,
    [services],
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
          <View style={styles.titleRow}>
            <MaterialCommunityIcons color={colors.textStrong} name="account-tie" size={28} />
            <Text style={styles.title}>Bienvenido</Text>
          </View>
          <Text style={styles.ownerName}>Usuario: {username ?? 'Sin nombre'}</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Tarjeta Resumen del mes — tap navega a ServiciosPrestados con autosearch */}
        <Pressable onPress={handleOpenMonthSummary} style={styles.summaryCard}>
          <LinearGradient
            colors={['#d6ebff', '#b7daff', '#99c9ff']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.summaryCardGradient}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryEyebrow}>Valores</Text>
              <Text style={styles.summaryTap}>Ver detalle →</Text>
            </View>

            <Text style={styles.summaryTitle}>Periodo actual</Text>
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
                <Text style={styles.metricLabel}>Valor acumulado</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{currency(totals.totalCopago)}</Text>
                <Text style={styles.metricLabel}>Copago acumulado</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <SectionCard title="Cierre de servicios" subtitle="Drilldown local para terminados y completados de los ultimos movimientos.">
          <View style={styles.closingsChartRow}>
            <Pressable
              onPress={() => navigation.navigate('Cierres')}
              style={styles.closingsSegmentPressable}
            >
              <LinearGradient
                colors={['#ffe28a', '#f4c742', '#cf8b00']}
                end={{ x: 1, y: 0.5 }}
                start={{ x: 0, y: 0.5 }}
                style={[styles.closingsSegment, styles.closingsSegmentWarning]}
              >
                <Text style={[styles.closingsTitle, styles.closingsTitleWarning]}>Terminados</Text>
                <Text style={[styles.closingsValue, styles.closingsValueWarning]}>{terminatedCount}</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Cierres')}
              style={styles.closingsSegmentPressable}
            >
              <LinearGradient
                colors={['#7ce9a2', '#2fc36a', '#138b45']}
                end={{ x: 1, y: 0.5 }}
                start={{ x: 0, y: 0.5 }}
                style={[styles.closingsSegment, styles.closingsSegmentSuccess]}
              >
                <Text style={[styles.closingsTitle, styles.closingsTitleSuccess]}>Completados</Text>
                <Text style={[styles.closingsValue, styles.closingsValueSuccess]}>{completedCount}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.closingsHelper}>Toca un segmento para ir al detalle de cierres.</Text>
        </SectionCard>

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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ownerName: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textTransform: 'capitalize',
  },
  // Tarjeta resumen
  summaryCard: {
    borderColor: colors.accent,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryCardGradient: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  summaryEyebrow: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summaryTap: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    position: 'absolute',
    right: 0,
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
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  metricDivider: {
    backgroundColor: colors.border,
    height: 40,
    width: 1,
  },
  closingsChartRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  closingsSegmentPressable: {
    flex: 1,
  },
  closingsSegment: {
    borderRadius: 18,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 120,
    padding: spacing.md,
  },
  closingsSegmentWarning: {
    borderColor: '#c78800',
    borderWidth: 1,
  },
  closingsSegmentSuccess: {
    borderColor: '#1d8d44',
    borderWidth: 1,
  },
  closingsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closingsTitleWarning: {
    color: '#2f1d00',
  },
  closingsTitleSuccess: {
    color: '#ffffff',
  },
  closingsValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  closingsValueWarning: {
    color: '#2f1d00',
  },
  closingsValueSuccess: {
    color: '#ffffff',
  },
  closingsHelper: {
    color: colors.muted,
    fontSize: 14,
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
