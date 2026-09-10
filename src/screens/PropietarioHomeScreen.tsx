import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Bus,
  Car,
  MapPin,
  Navigation,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import { OwnerBottomBar } from '../components/OwnerBottomBar';
import { RoleGate } from '../components/RoleGate';
import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { spacing } from '../theme';

type Props = DrawerScreenProps<DrawerParamList, 'PropietarioHome'>;

// ─────────────────────────────────────────────────────────────
// SCA Soluciones brand palette
// ─────────────────────────────────────────────────────────────
const SCA = {
  navy: '#1B2A4A',
  navyDeep: '#131E36',
  blue: '#0FA0F3',
  blueSoft: '#E6F4FD',
  sky: '#7FB3D5',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  muted: '#8B96AC',
  border: '#E2E8F0',
  success: '#10B981',
  successSoft: '#E7F8F1',
  neutralSoft: '#EEF1F6',
} as const;

// Altura reservada para que la barra flotante no tape el último item.
const BOTTOM_BAR_OFFSET = 120;

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
}

function currency(value: number) {
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString('es-CO')} · ${date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

// ─────────────────────────────────────────────────────────────
// Avatar con iniciales sobre gradiente SCA
// ─────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <LinearGradient
      colors={[SCA.sky, SCA.blue]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.avatar}
    >
      <Text style={styles.avatarText}>{initials || '·'}</Text>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────
type KpiVariant = 'services' | 'amount' | 'copays';

const KPI_STYLE: Record<
  KpiVariant,
  { Icon: LucideIcon; color: string; bg: string }
> = {
  services: { Icon: Bus,        color: SCA.blue,    bg: SCA.blueSoft },
  amount:   { Icon: TrendingUp, color: SCA.success, bg: SCA.successSoft },
  copays:   { Icon: Wallet,     color: SCA.navy,    bg: SCA.neutralSoft },
};

function KpiCard({
  variant,
  value,
  label,
}: {
  variant: KpiVariant;
  value: string;
  label: string;
}) {
  const { Icon, color, bg } = KPI_STYLE[variant];
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrap, { backgroundColor: bg }]}>
        <Icon color={color} size={18} strokeWidth={2.5} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Service Card
// ─────────────────────────────────────────────────────────────
type ServiceCardProps = {
  fechaServicio: string;
  placa: string;
  origenDireccion: string;
  destinoDireccion: string;
  valor: number;
  copago: number;
};

function ServiceCard({
  fechaServicio,
  placa,
  origenDireccion,
  destinoDireccion,
  valor,
  copago,
}: ServiceCardProps) {
  return (
    <View style={styles.serviceCard}>
      {/* Header: fecha + placa */}
      <View style={styles.serviceHeader}>
        <View style={styles.serviceDateRow}>
          <View style={styles.serviceBullet} />
          <Text style={styles.serviceDateText} numberOfLines={1}>
            {formatDateTime(fechaServicio)}
          </Text>
        </View>
        <View style={styles.plateChip}>
          <Text style={styles.plateText} numberOfLines={1}>
            {placa}
          </Text>
        </View>
      </View>

      {/* Ruta: origen → destino */}
      <View style={styles.routeBlock}>
        <View style={styles.routeItem}>
          <View style={[styles.routeIconWrap, styles.routeIconOrigin]}>
            <MapPin color={SCA.blue} size={14} strokeWidth={2.5} />
          </View>
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>Origen</Text>
            <Text style={styles.routeValue} numberOfLines={3}>
              {origenDireccion}
            </Text>
          </View>
        </View>

        <View style={styles.routeConnector}>
          <View style={styles.routeConnectorLine} />
          <ArrowRight color={SCA.muted} size={12} strokeWidth={2.5} />
        </View>

        <View style={styles.routeItem}>
          <View style={[styles.routeIconWrap, styles.routeIconDest]}>
            <Navigation color={SCA.navy} size={14} strokeWidth={2.5} />
          </View>
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>Destino</Text>
            <Text style={styles.routeValue} numberOfLines={3}>
              {destinoDireccion}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer: valor + copago */}
      <View style={styles.serviceFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Valor</Text>
          <Text style={styles.footerValue}>{currency(valor)}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Copago</Text>
          <Text style={styles.footerValue}>{currency(copago)}</Text>
        </View>
      </View>
    </View>
  );
}

export function PropietarioHomeScreen({}: Props) {
  const {
    ownerServices,
    ownerServicesLoadError,
    isLoadingOwnerServices,
    reloadOwnerServices,
    username,
    mobilUser,
    selectedVehiculo,
  } = useSession();

  // Real assigned services for whichever owned vehicle is currently selected (Locatario-based).
  const placa = selectedVehiculo?.placa ?? mobilUser?.Placa ?? '-';
  const userName = mobilUser?.Nombre ?? username ?? 'Sin nombre';

  const todayServices = useMemo(() => {
    const today = toInputDate(new Date().toISOString());
    return ownerServices
      .filter((service) => toInputDate(service.fechaServicio) === today)
      .sort(
        (a, b) =>
          new Date(a.fechaServicio).getTime() - new Date(b.fechaServicio).getTime(),
      );
  }, [ownerServices]);

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
      <RoleGate allowedRoles={['PROPIETARIO', 'AMBOS']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={[SCA.blue]}
              onRefresh={reloadOwnerServices}
              refreshing={isLoadingOwnerServices}
              tintColor={SCA.blue}
            />
          }
        >
          {/* ─── Header ─────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Avatar name={userName} />
              <View style={styles.headerIdentity}>
                <Text numberOfLines={1} style={styles.userName}>
                  {userName}
                </Text>
                <Text numberOfLines={1} style={styles.userMeta}>
                  Próximos servicios programados
                </Text>
              </View>
            </View>

            <View style={styles.vehicleChip}>
              <Car color={SCA.blue} size={14} strokeWidth={2.5} />
              <Text numberOfLines={1} style={styles.vehicleChipText}>
                Vehículo {placa}
              </Text>
            </View>
          </View>

          {/* ─── KPIs ───────────────────────────────────────── */}
          <View style={styles.metricsRow}>
            <KpiCard
              label="Total de servicios"
              value={String(totals.count)}
              variant="services"
            />
            <KpiCard
              label="Valor acumulado"
              value={currency(totals.totalValue)}
              variant="amount"
            />
            <KpiCard
              label="Valor copagos"
              value={currency(totals.totalCopago)}
              variant="copays"
            />
          </View>

          {/* ─── Lista de servicios ─────────────────────────── */}
          {todayServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {ownerServicesLoadError ?? 'No hay servicios programados aún.'}
              </Text>
            </View>
          ) : (
            todayServices.map((service) => (
              <ServiceCard
                key={`${service.orden}-${service.numeroServicio}`}
                copago={service.copago}
                destinoDireccion={service.destinoDireccion}
                fechaServicio={service.fechaServicio}
                origenDireccion={service.origenDireccion}
                placa={placa}
                valor={service.valor}
              />
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
    backgroundColor: SCA.surfaceSoft,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: BOTTOM_BAR_OFFSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // ─── Header ────────────────────────────────────────────────
  header: {
    gap: spacing.md,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: SCA.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerIdentity: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: SCA.navy,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  userMeta: {
    color: SCA.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  vehicleChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: SCA.blueSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  vehicleChipText: {
    color: SCA.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── KPIs ──────────────────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCard: {
    alignItems: 'flex-start',
    backgroundColor: SCA.surface,
    borderColor: SCA.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: SCA.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  kpiIconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    marginBottom: 4,
    width: 32,
  },
  kpiValue: {
    color: SCA.navy,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    color: SCA.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 14,
  },

  // ─── Empty state ───────────────────────────────────────────
  emptyCard: {
    alignItems: 'center',
    backgroundColor: SCA.surface,
    borderColor: SCA.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  emptyText: {
    color: SCA.muted,
    fontSize: 14,
    textAlign: 'center',
  },

  // ─── Service Card ──────────────────────────────────────────
  serviceCard: {
    backgroundColor: SCA.surface,
    borderColor: SCA.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
    shadowColor: SCA.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  serviceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.xs,
  },
  serviceBullet: {
    backgroundColor: SCA.blue,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  serviceDateText: {
    color: SCA.blue,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  plateChip: {
    backgroundColor: SCA.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  plateText: {
    color: SCA.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // ─── Ruta ──────────────────────────────────────────────────
  routeBlock: {
    gap: spacing.xs,
  },
  routeItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  routeIconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    marginTop: 2,
    width: 28,
  },
  routeIconOrigin: {
    backgroundColor: SCA.blueSoft,
  },
  routeIconDest: {
    backgroundColor: SCA.neutralSoft,
  },
  routeTextWrap: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    color: SCA.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  routeValue: {
    color: SCA.navy,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  routeConnector: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginLeft: 14,
    opacity: 0.6,
  },
  routeConnectorLine: {
    backgroundColor: SCA.border,
    height: 1,
    width: 16,
  },

  // ─── Footer del servicio ──────────────────────────────────
  serviceFooter: {
    alignItems: 'center',
    borderTopColor: SCA.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  footerItem: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 2,
  },
  footerLabel: {
    color: SCA.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footerValue: {
    color: SCA.navy,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  footerDivider: {
    backgroundColor: SCA.border,
    height: 24,
    marginHorizontal: spacing.sm,
    width: StyleSheet.hairlineWidth,
  },
});