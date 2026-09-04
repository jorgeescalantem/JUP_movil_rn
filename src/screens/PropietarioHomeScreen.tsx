import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Bus, TrendingUp, Wallet, type LucideIcon } from 'lucide-react-native';

import { OwnerBottomBar } from '../components/OwnerBottomBar';
import { RoleGate } from '../components/RoleGate';
import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

type Props = DrawerScreenProps<DrawerParamList, 'PropietarioHome'>;

// Brand gradient reused across the app (submit buttons, app icon).
const BRAND_GRADIENT = ['#2fdeb0', '#1bbbe8', '#0fa0f3'] as const;

function GradientIcon({ icon: Icon, size = 20 }: { icon: LucideIcon; size?: number }) {
  const badgeSize = size + 20;
  return (
    <LinearGradient
      colors={BRAND_GRADIENT}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.iconBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}
    >
      <Icon color="#ffffff" size={size} />
    </LinearGradient>
  );
}

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
}

function currency(value: number) {
  return `$ ${value.toLocaleString('es-CO')}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('es-CO')} · ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
}

export function PropietarioHomeScreen({}: Props) {
  const { services, username, mobilUser, selectedVehiculo } = useSession();

  // Services aren't fetched per-plate yet, so the whole list belongs to a single vehicle context.
  const placa = selectedVehiculo?.placa ?? mobilUser?.Placa ?? '-';

  const todayServices = useMemo(() => {
    const today = toInputDate(new Date().toISOString());
    return services
      .filter((service) => toInputDate(service.fechaServicio) === today)
      .sort((a, b) => new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime());
  }, [services]);

  const totals = todayServices.reduce(
    (acc, service) => ({
      count: acc.count + 1,
      totalValue: acc.totalValue + service.valor,
      totalCopago: acc.totalCopago + service.copago,
    }),
    { count: 0, totalValue: 0, totalCopago: 0 },
  );

  return (
    <View style={styles.screen}>
      <RoleGate allowedRoles={['PROPIETARIO']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.greeting}>
            <Text style={styles.eyebrow}> {mobilUser?.Nombre ?? username ?? 'Sin nombre'}</Text>
            <Text style={styles.title}>Programación Diaria</Text>
            <Text style={styles.subtitle}>Vehículo {placa}.</Text>
          </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <GradientIcon icon={Bus} size={18} />
            <Text style={styles.metricValue}>{totals.count}</Text>
            <Text numberOfLines={2} style={styles.metricLabel}>Servicios de hoy</Text>
          </View>
          <View style={styles.metricCard}>
            <GradientIcon icon={TrendingUp} size={18} />
            <Text style={styles.metricValue}>{currency(totals.totalValue)}</Text>
            <Text numberOfLines={2} style={styles.metricLabel}>Valor acumulado</Text>
          </View>
          <View style={styles.metricCard}>
            <GradientIcon icon={Wallet} size={18} />
            <Text style={styles.metricValue}>{currency(totals.totalCopago)}</Text>
            <Text numberOfLines={2} style={styles.metricLabel}>Valor Copagos</Text>
          </View>
        </View>

        {todayServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay servicios programados para hoy.</Text>
          </View>
        ) : (
          todayServices.map((service) => (
            <View key={`${service.orden}-${service.numeroServicio}`} style={styles.serviceCard}>
              <View style={styles.serviceCardHeader}>
                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.serviceDate}>{formatDateTime(service.fechaServicio)}</Text>
                </View>
                <Text style={styles.servicePlate}>{placa}</Text>
              </View>

              <Text style={styles.routeLabel}>Origen</Text>
              <Text style={styles.routeValue}>{service.origenDireccion}</Text>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={styles.routeValue}>{service.destinoDireccion}</Text>

              <View style={styles.serviceCardFooter}>
                <Text style={styles.footerText}>
                  Valor: <Text style={styles.footerValue}>{currency(service.valor)}</Text>
                </Text>
                <Text style={styles.footerText}>
                  Copago: <Text style={styles.footerValue}>{currency(service.copago)}</Text>
                </Text>
              </View>
            </View>
          ))
        )}
        </ScrollView>

        <OwnerBottomBar />
      </RoleGate>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  greeting: {
    gap: 2,
    marginTop: 4,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  metricValue: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    minHeight: 28,
    textAlign: 'center',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  serviceCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bulletRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bulletDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  serviceDate: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  servicePlate: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  routeValue: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  serviceCardFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
  },
  footerValue: {
    color: colors.textStrong,
    fontWeight: '700',
  },
});

