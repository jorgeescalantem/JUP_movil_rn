import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Circle } from '@shopify/react-native-skia';
import { Bar, CartesianChart, Line } from 'victory-native';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Flag,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  MoonStar,
  Navigation,
  PackageCheck,
  SunMedium,
  Truck,
} from 'lucide-react-native';

import { RoleGate } from '../components/RoleGate';
import { OwnerBottomBar } from '../components/OwnerBottomBar';
import { useSession } from '../store/session';
import { spacing } from '../theme';

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
  warning: '#B07800',
  warningSoft: '#FFF8DC',
  neutralSoft: '#EEF1F6',
  textStrong: '#1B2A4A',
} as const;

// ── Theme (light/dark) ──────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark';

type ScreenPalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textStrong: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  chartBar: string;
  chartBarToday: string;
  chartLine: string;
};

const LIGHT_PALETTE: ScreenPalette = {
  background: SCA.surfaceSoft,
  surface: SCA.surface,
  surfaceAlt: SCA.neutralSoft,
  border: SCA.border,
  textStrong: SCA.navy,
  textMuted: SCA.muted,
  accent: SCA.blue,
  accentSoft: SCA.blueSoft,
  chartBar: SCA.navy,
  chartBarToday: SCA.blue,
  chartLine: SCA.sky,
};

const DARK_PALETTE: ScreenPalette = {
  background: SCA.navyDeep,
  surface: SCA.navy,
  surfaceAlt: '#243458',
  border: '#2C3A5A',
  textStrong: '#F1F5F9',
  textMuted: '#94A3B8',
  accent: SCA.sky,
  accentSoft: '#123044',
  chartBar: SCA.sky,
  chartBarToday: '#34D399',
  chartLine: '#FB923C',
};

// ── Mock histogram data per filter ──────────────────────────────────────────
type FilterKey = '7' | '15' | '30';

const MOCK_DATA: Record<FilterKey, { day: string; count: number }[]> = {
  '7': [
    { day: 'LUN', count: 2 },
    { day: 'MAR', count: 3 },
    { day: 'MIE', count: 5 },
    { day: 'JUE', count: 3 },
    { day: 'VIE', count: 4 },
    { day: 'SAB', count: 2 },
    { day: 'DOM', count: 4 },
  ],
  '15': [
    { day: '23A', count: 3 }, { day: '24A', count: 1 }, { day: '25A', count: 4 },
    { day: '26A', count: 2 }, { day: '27A', count: 5 }, { day: '28A', count: 3 },
    { day: '29A', count: 0 }, { day: '30A', count: 4 }, { day: '01M', count: 3 },
    { day: '02M', count: 5 }, { day: '03M', count: 2 }, { day: '04M', count: 4 },
    { day: '05M', count: 3 }, { day: '06M', count: 1 }, { day: '07M', count: 4 },
  ],
  '30': [
    { day: '08', count: 2 }, { day: '09', count: 4 }, { day: '10', count: 3 },
    { day: '11', count: 1 }, { day: '12', count: 5 }, { day: '13', count: 2 },
    { day: '14', count: 3 }, { day: '15', count: 4 }, { day: '16', count: 2 },
    { day: '17', count: 5 }, { day: '18', count: 3 }, { day: '19', count: 1 },
    { day: '20', count: 4 }, { day: '21', count: 2 }, { day: '22', count: 3 },
    { day: '23', count: 3 }, { day: '24', count: 1 }, { day: '25', count: 4 },
    { day: '26', count: 2 }, { day: '27', count: 5 }, { day: '28', count: 3 },
    { day: '29', count: 0 }, { day: '30', count: 4 }, { day: '01', count: 3 },
    { day: '02', count: 5 }, { day: '03', count: 2 }, { day: '04', count: 4 },
    { day: '05', count: 3 }, { day: '06', count: 1 }, { day: '07', count: 4 },
  ],
};

const FILTER_OPTS: { key: FilterKey; label: string }[] = [
  { key: '7',  label: '7 días' },
  { key: '15', label: '15 días' },
  { key: '30', label: '30 días' },
];

// Horizontal padding: screen(24) + card(24) each side → total 96
const H_PADDING = 96;
const BAR_AREA_H = 140; // px — bar drawing area height

type StatConfig = {
  key: string;
  label: string;
  icon: LucideIcon;
  light: { bg: string; color: string };
  dark: { bg: string; color: string };
};

const STAT_CONFIGS: StatConfig[] = [
  {
    key: 'ASIGNADA',
    label: 'ASIGNADO',
    icon: Clock3,
    light: { bg: SCA.blueSoft, color: SCA.blue },
    dark: { bg: '#123044', color: '#7DD3FC' },
  },
  {
    key: 'EN_TRANSITO',
    label: 'EN TRÁNSITO',
    icon: Navigation,
    light: { bg: SCA.warningSoft, color: SCA.warning },
    dark: { bg: '#3A2F0D', color: '#FBBF24' },
  },
  {
    key: 'TERMINADO',
    label: 'TERMINADO',
    icon: CheckCircle2,
    light: { bg: SCA.neutralSoft, color: '#444444' },
    dark: { bg: '#232B35', color: '#CBD5E1' },
  },
  {
    key: 'COMPLETADO',
    label: 'COMPLETADO',
    icon: PackageCheck,
    light: { bg: SCA.successSoft, color: SCA.success },
    dark: { bg: '#0F2F22', color: '#34D399' },
  },
];

// ── Card 2 visual presets per service state, themed for light/dark ─────────
type StateVisualKey = 'TERMINADO' | 'EN_TRANSITO' | 'ACTIVO';

type StateThemeColors = {
  cardBg: string;
  cardBorder: string;
  accent: string;
  badgeBg: string;
  divider: string;
};

type StateVisual = {
  title: string;
  badgeText: string;
  icon: LucideIcon;
  light: StateThemeColors;
  dark: StateThemeColors;
};

const STATE_VISUALS: Record<StateVisualKey, StateVisual> = {
  TERMINADO: {
    title: 'Servicio terminado',
    badgeText: 'TERMINADO',
    icon: Flag,
    light: {
      cardBg: '#FFF5E6',
      cardBorder: '#F8D9A8',
      accent: '#B45309',
      badgeBg: '#F59E0B',
      divider: '#F3C988',
    },
    dark: {
      cardBg: '#2A1F0F',
      cardBorder: '#4D3A17',
      accent: '#FBBF24',
      badgeBg: '#D97706',
      divider: '#4D3A17',
    },
  },
  EN_TRANSITO: {
    title: 'Servicio en tránsito',
    badgeText: 'EN VIVO',
    icon: Truck,
    light: {
      cardBg: SCA.blueSoft,
      cardBorder: '#9FC8EE',
      accent: SCA.blue,
      badgeBg: SCA.blue,
      divider: '#9FC8EE',
    },
    dark: {
      cardBg: '#0D2436',
      cardBorder: '#1C4A68',
      accent: '#38BDF8',
      badgeBg: '#0EA5E9',
      divider: '#1C4A68',
    },
  },
  ACTIVO: {
    title: 'Servicio activo',
    badgeText: 'ACTIVO',
    icon: Activity,
    light: {
      cardBg: SCA.neutralSoft,
      cardBorder: SCA.border,
      accent: SCA.navy,
      badgeBg: SCA.navy,
      divider: SCA.border,
    },
    dark: {
      cardBg: SCA.navy,
      cardBorder: '#293544',
      accent: '#94A3B8',
      badgeBg: '#334155',
      divider: '#293544',
    },
  },
};

export function ServiceStatusScreen() {
  const { activeService, ownerActiveService, statusCounts, role } = useSession();
  // `activeService` only ever reflects the conductor's own local state
  // (arrivedAtOrigin/deliverService on their device); a PROPIETARIO/AMBOS
  // viewing their vehicle's real summary needs `ownerActiveService` instead.
  const displayActiveService = role === 'CONDUCTOR' ? activeService : ownerActiveService;

  const { width: screenWidth } = useWindowDimensions();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [filter, setFilter] = useState<FilterKey>('7');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const palette = themeMode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
  const styles = useMemo(() => createStyles(palette), [palette]);

  const chartData = MOCK_DATA[filter];
  const maxCount  = Math.max(...chartData.map((d) => d.count), 1);
  const chartW    = screenWidth - H_PADDING;
  const slotW     = chartW / chartData.length;

  const barHeight = (count: number) => Math.max(6, (count / maxCount) * BAR_AREA_H);
  const barCenterX = (i: number) => i * slotW + slotW / 2;

  const getDateForBar = (index: number) => {
    const date = new Date();
    const daysBack = chartData.length - 1 - index;
    date.setDate(date.getDate() - daysBack);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Today highlight only on 7-day view
  const todayIndex   = new Date().getDay();
  const highlightIdx = filter === '7' ? (todayIndex === 0 ? 6 : todayIndex - 1) : -1;

  const stateVisualKey: StateVisualKey = displayActiveService?.estado === 'TERMINADO'
    ? 'TERMINADO'
    : displayActiveService?.estado === 'EN_TRANSITO'
      ? 'EN_TRANSITO'
      : 'ACTIVO';
  const stateVisual = STATE_VISUALS[stateVisualKey];
  const stateColors = stateVisual[themeMode];
  const StateIcon = stateVisual.icon;
  const ThemeIcon = themeMode === 'light' ? MoonStar : SunMedium;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO', 'AMBOS']}>
        <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.content}>

          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBadge}>
                <LayoutDashboard color={palette.accent} size={22} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>Resumen Diario</Text>
                <Text numberOfLines={1} style={styles.headerSubtitle}>
                  Servicios en tiempo real
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Cambiar tema"
              hitSlop={8}
              onPress={() => setThemeMode((current) => (current === 'light' ? 'dark' : 'light'))}
              style={styles.themeToggle}
            >
              <ThemeIcon color={palette.accent} size={20} />
            </Pressable>
          </Animated.View>

          {/* ── Card 1: Servicios del día ── */}
          <Animated.View entering={FadeInUp.delay(80).duration(400)} style={styles.card}>
            <View style={styles.cardTitleRow}>
              <ListChecks color={palette.accent} size={20} />
              <View style={styles.cardTitleTextGroup}>
                <Text style={styles.cardTitle}>Servicios del día</Text>
                <Text style={styles.cardSubtitle}>Estado de los servicios de hoy</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              {STAT_CONFIGS.map(({ key, label, icon: StatIcon, light, dark }) => {
                const tone = themeMode === 'light' ? light : dark;
                return (
                  <View key={key} style={[styles.statBox, { backgroundColor: tone.bg }]}>
                    <StatIcon color={tone.color} size={18} />
                    <Text style={[styles.statValue, { color: tone.color }]}>
                      {(statusCounts as Record<string, number>)[key] ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: tone.color }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Card 2: Servicio activo / en tránsito / terminado ── */}
          <Animated.View
            entering={FadeInUp.delay(160).duration(400)}
            style={[styles.card, { backgroundColor: stateColors.cardBg, borderColor: stateColors.cardBorder }]}
          >
            <View style={styles.transitHeader}>
              <View style={styles.transitTitleGroup}>
                <StateIcon color={stateColors.accent} size={20} />
                <Text style={[styles.transitTitle, { color: stateColors.accent }]}>
                  {stateVisual.title}
                </Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: stateColors.badgeBg }]}>
                <Text style={styles.badgeText}>{stateVisual.badgeText}</Text>
              </View>
            </View>

            {displayActiveService ? (
              <>
                {/* Vehicle row */}
                <View style={styles.vehicleRow}>
                  <Building2 color={stateColors.accent} size={22} />
                  <View style={styles.vehicleInfo}>
                    <Text style={[styles.vehicleLabel, { color: stateColors.accent }]}>
                      CONTRATO
                    </Text>
                    <Text style={[styles.vehicleValue, { color: palette.textStrong }]}>
                      {displayActiveService.contrato}
                    </Text>
                    <Text style={[styles.vehicleLabel, { color: stateColors.accent }]}>
                      EMPRESA
                    </Text>
                    <Text style={styles.companyValue}>
                      {displayActiveService.companiaNombre}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: stateColors.divider }]} />

                {/* Origin / destination */}
                <View style={styles.routeRow}>
                  <View style={styles.routeCol}>
                    <Text style={[styles.routeLabel, { color: stateColors.accent }]}>
                      ORIGEN
                    </Text>
                    <Text style={[styles.routeValue, { color: palette.textStrong }]}>
                      {displayActiveService.origenDireccion}
                    </Text>
                  </View>
                  <View style={styles.routeCol}>
                    <Text style={[styles.routeLabel, { color: stateColors.accent }]}>
                      DESTINO
                    </Text>
                    <Text style={[styles.routeValue, { color: palette.textStrong }]}>
                      {displayActiveService.destinoDireccion}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: stateColors.divider }]} />

                {/* Service number / start time */}
                <View style={styles.routeRow}>
                  <View style={styles.routeCol}>
                    <Text style={[styles.routeLabel, { color: stateColors.accent }]}>
                      SERVICIO
                    </Text>
                    <Text style={[styles.routeValue, { color: palette.textStrong }]}>
                      #{displayActiveService.numeroServicio}
                    </Text>
                  </View>
                  <View style={styles.routeCol}>
                    <Text style={[styles.routeLabel, { color: stateColors.accent }]}>
                      HORA DE INICIO
                    </Text>
                    <Text style={[styles.routeValue, { color: palette.textStrong }]}>
                      {displayActiveService.HoraRecogida}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>No hay servicio en tránsito en este momento</Text>
            )}
          </Animated.View>

          {/* ── Card 3: Histórico de servicios ── */}
          <Animated.View entering={FadeInUp.delay(240).duration(400)} style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart3 color={palette.accent} size={20} />
              <Text style={styles.cardTitle}>Histórico de servicios</Text>
            </View>

            {/* ── Filter toggle ── */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>FILTRAR:</Text>
              <View style={styles.filterGroup}>
                {FILTER_OPTS.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setFilter(key);
                      setSelectedBarIndex(null);
                      setSelectedDate(null);
                    }}
                    style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, filter === key && styles.filterBtnTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Chart (victory-native + skia) ── */}
            <View style={[styles.chartContainer, { width: chartW, height: BAR_AREA_H }]}>
              <CartesianChart
                data={chartData}
                domain={{ y: [0, maxCount] }}
                domainPadding={{ left: slotW / 2, right: slotW / 2 }}
                xKey="day"
                yKeys={['count']}
              >
                {({ points, chartBounds }) => (
                  <>
                    <Bar
                      animate={{ type: 'timing', duration: 350 }}
                      barCount={chartData.length}
                      chartBounds={chartBounds}
                      color={palette.chartBar}
                      innerPadding={0.4}
                      points={points.count}
                      roundedCorners={{ topLeft: 6, topRight: 6 }}
                    />
                    {highlightIdx >= 0 ? (
                      <Bar
                        barCount={chartData.length}
                        chartBounds={chartBounds}
                        color={palette.chartBarToday}
                        innerPadding={0.4}
                        points={[points.count[highlightIdx]]}
                        roundedCorners={{ topLeft: 6, topRight: 6 }}
                      />
                    ) : null}
                    {selectedBarIndex !== null ? (
                      <Bar
                        barCount={chartData.length}
                        chartBounds={chartBounds}
                        color={palette.chartLine}
                        innerPadding={0.4}
                        points={[points.count[selectedBarIndex]]}
                        roundedCorners={{ topLeft: 6, topRight: 6 }}
                      />
                    ) : null}
                    <Line
                      animate={{ type: 'timing', duration: 350 }}
                      color={palette.chartLine}
                      curveType="natural"
                      points={points.count}
                      strokeWidth={2}
                    />
                    {points.count.map((point, i) =>
                      typeof point.y === 'number' ? (
                        <Circle key={`dot-${i}`} color={palette.chartLine} cx={point.x} cy={point.y} r={3.5} />
                      ) : null,
                    )}
                  </>
                )}
              </CartesianChart>

              {/* Count labels above each bar */}
              {chartData.map((item, i) => (
                <Text
                  key={`cnt-${i}`}
                  style={[
                    styles.barCountLabel,
                    {
                      bottom: barHeight(item.count) + 4,
                      left: barCenterX(i) - slotW / 2,
                      width: slotW,
                      color: i === highlightIdx ? palette.chartBarToday : palette.chartBar,
                      fontSize: filter === '30' ? 7 : 10,
                    },
                  ]}
                >
                  {item.count}
                </Text>
              ))}

              {/* Transparent touch overlay, preserves tap-to-select behaviour */}
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                {chartData.map((item, i) => (
                  <Pressable
                    key={`hit-${i}`}
                    onPress={() => {
                      setSelectedBarIndex(i);
                      setSelectedDate(getDateForBar(i));
                    }}
                    style={{ position: 'absolute', left: i * slotW, top: 0, width: slotW, height: '100%' }}
                  />
                ))}
              </View>
            </View>

            {/* ── Day labels row ── */}
            <View style={styles.dayLabelsRow}>
              {chartData.map((item, i) => {
                const isToday = i === highlightIdx;
                const isSelected = i === selectedBarIndex;
                // For 30-day view, only show label every 5th bar
                const showLabel = filter === '30' ? i % 5 === 0 : true;
                return (
                  <View key={`dl-${i}`} style={styles.dayLabelCell}>
                    <Text
                      style={[
                        styles.dayLabelText,
                        {
                          color: isSelected
                            ? palette.chartLine
                            : isToday
                              ? palette.chartBarToday
                              : palette.textMuted,
                          fontWeight: isToday || isSelected ? '800' : '600',
                          fontSize: filter === '30' ? 8 : filter === '15' ? 9 : 10,
                          opacity: showLabel ? 1 : 0,
                        },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.chartHint}>Toca una barra para ver el detalle del día</Text>
            {selectedDate !== null ? (
              <Text style={styles.selectedDayText}>Fecha: {selectedDate}</Text>
            ) : null}
          </Animated.View>

        </ScrollView>

        {role === 'PROPIETARIO' || role === 'AMBOS' ? <OwnerBottomBar /> : null}
      </RoleGate>
    </View>
  );
}

function createStyles(palette: ScreenPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl + 60,
    },

    /* ── Header ── */
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headerLeft: {
      alignItems: 'center',
      flexDirection: 'row',
      flexShrink: 1,
      gap: spacing.sm,
    },
    headerTextGroup: {
      flexShrink: 1,
      gap: 2,
    },
    headerIconBadge: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 16,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    headerTitle: {
      color: palette.textStrong,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 2,
    },
    themeToggle: {
      alignItems: 'center',
      backgroundColor: palette.surfaceAlt,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },

    /* ── Shared card ── */
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      gap: spacing.md,
      padding: spacing.lg,
      shadowColor: SCA.navy,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
    },
    cardTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    cardTitleTextGroup: {
      flexShrink: 1,
      gap: 2,
    },
    cardTitle: {
      color: palette.textStrong,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    cardSubtitle: {
      color: palette.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },

    /* ── Stats grid ── */
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 2,
    },
    statBox: {
      alignItems: 'center',
      borderRadius: 16,
      flex: 1,
      gap: 4,
      minWidth: '44%',
      paddingVertical: 16,
    },
    statValue: {
      fontSize: 32,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    /* ── Transit-style card ── */
    transitHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    transitTitleGroup: {
      alignItems: 'center',
      flexDirection: 'row',
      flexShrink: 1,
      gap: 8,
    },
    transitTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    badgePill: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    vehicleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    vehicleInfo: {
      flex: 1,
      gap: 1,
    },
    vehicleLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    vehicleValue: {
      fontSize: 17,
      fontWeight: '800',
    },
    companyValue: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
    },
    routeRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    routeCol: {
      flex: 1,
      gap: 2,
    },
    routeLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    routeValue: {
      fontSize: 14,
      lineHeight: 20,
    },
    emptyText: {
      color: palette.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },

    /* ── Filter row ── */
    filterRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    filterLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    filterGroup: {
      flexDirection: 'row',
      gap: 6,
    },
    filterBtn: {
      borderColor: palette.border,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    filterBtnActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    filterBtnText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    filterBtnTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    /* ── Chart ── */
    chartContainer: {
      marginTop: 8,
      position: 'relative',
    },
    barCountLabel: {
      fontWeight: '700',
      position: 'absolute',
      textAlign: 'center',
    },
    dayLabelsRow: {
      flexDirection: 'row',
    },
    dayLabelCell: {
      alignItems: 'center',
      flex: 1,
    },
    dayLabelText: {
      textAlign: 'center',
    },
    chartHint: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 8,
    },
    selectedDayText: {
      color: palette.textStrong,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
  });
}