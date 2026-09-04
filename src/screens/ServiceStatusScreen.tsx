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
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f5',
  border: '#e0e7ef',
  textStrong: '#121417',
  textMuted: '#4a5568',
  accent: '#006493',
  accentSoft: '#dbeeff',
  chartBar: '#006493',
  chartBarToday: '#1a6b43',
  chartLine: '#ff6424',
};

const DARK_PALETTE: ScreenPalette = {
  background: '#0f1720',
  surface: '#161f2b',
  surfaceAlt: '#1c2733',
  border: '#293544',
  textStrong: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentSoft: '#123044',
  chartBar: '#38bdf8',
  chartBarToday: '#34d399',
  chartLine: '#fb923c',
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
  { key: 'ASIGNADA', label: 'ASIGNADO', icon: Clock3, light: { bg: '#dbeeff', color: '#006493' }, dark: { bg: '#123044', color: '#7dd3fc' } },
  { key: 'EN_TRANSITO', label: 'EN TRÁNSITO', icon: Navigation, light: { bg: '#fff8dc', color: '#b07800' }, dark: { bg: '#3a2f0d', color: '#fbbf24' } },
  { key: 'TERMINADO', label: 'TERMINADO', icon: CheckCircle2, light: { bg: '#f4f4f4', color: '#444444' }, dark: { bg: '#232b35', color: '#cbd5e1' } },
  { key: 'COMPLETADO', label: 'COMPLETADO', icon: PackageCheck, light: { bg: '#d9f5e8', color: '#1a7a4e' }, dark: { bg: '#0f2f22', color: '#34d399' } },
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
    light: { cardBg: '#fff5e6', cardBorder: '#f8d9a8', accent: '#b45309', badgeBg: '#f59e0b', divider: '#f3c988' },
    dark: { cardBg: '#2a1f0f', cardBorder: '#4d3a17', accent: '#fbbf24', badgeBg: '#d97706', divider: '#4d3a17' },
  },
  EN_TRANSITO: {
    title: 'Servicio en tránsito',
    badgeText: 'LIVE',
    icon: Truck,
    light: { cardBg: '#dceeff', cardBorder: '#9fc8ee', accent: '#006493', badgeBg: '#0ea5e9', divider: '#9fc8ee' },
    dark: { cardBg: '#0d2436', cardBorder: '#1c4a68', accent: '#38bdf8', badgeBg: '#0ea5e9', divider: '#1c4a68' },
  },
  ACTIVO: {
    title: 'Servicio activo',
    badgeText: 'ACTIVO',
    icon: Activity,
    light: { cardBg: '#eef2f5', cardBorder: '#d5dee8', accent: '#1f3b57', badgeBg: '#006493', divider: '#d5dee8' },
    dark: { cardBg: '#161f2b', cardBorder: '#293544', accent: '#94a3b8', badgeBg: '#334155', divider: '#293544' },
  },
};

export function ServiceStatusScreen() {
  const { activeService, statusCounts, role } = useSession();

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

  const stateVisualKey: StateVisualKey = activeService?.estado === 'TERMINADO'
    ? 'TERMINADO'
    : activeService?.estado === 'EN_TRANSITO'
      ? 'EN_TRANSITO'
      : 'ACTIVO';
  const stateVisual = STATE_VISUALS[stateVisualKey];
  const stateColors = stateVisual[themeMode];
  const StateIcon = stateVisual.icon;
  const ThemeIcon = themeMode === 'light' ? MoonStar : SunMedium;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO']}>
        <ScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.content}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBadge}>
              <LayoutDashboard color={palette.accent} size={22} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Resumen Diario</Text>
              <Text style={styles.headerSubtitle}>Actividad de servicios en tiempo real</Text>
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
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Card 2: Servicio en tránsito / terminado / activo ── */}
        <Animated.View
          entering={FadeInUp.delay(160).duration(400)}
          style={[styles.card, { backgroundColor: stateColors.cardBg, borderColor: stateColors.cardBorder }]}
        >
          <View style={styles.transitHeader}>
            <View style={styles.transitTitleGroup}>
              <StateIcon color={stateColors.accent} size={20} />
              <Text style={styles.transitTitle}>{stateVisual.title}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: stateColors.badgeBg }]}>
              <Text style={styles.badgeText}>{stateVisual.badgeText}</Text>
            </View>
          </View>

          {activeService ? (
            <>
              {/* Vehicle row */}
              <View style={styles.vehicleRow}>
                <Building2 color={stateColors.accent} size={22} />
                <View style={styles.vehicleInfo}>
                  <Text style={[styles.vehicleLabel, { color: stateColors.accent }]}>CONTRATO</Text>
                  <Text style={styles.vehicleValue}>{activeService.contrato}</Text>
                  <Text style={[styles.vehicleLabel, { color: stateColors.accent }]}>EMPRESA</Text>
                  <Text style={styles.companyValue}>{activeService.companiaNombre}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: stateColors.divider }]} />

              {/* Origin / destination */}
              <View style={styles.routeRow}>
                <View style={styles.routeCol}>
                  <Text style={[styles.routeLabel, { color: stateColors.accent }]}>ORIGEN</Text>
                  <Text style={styles.routeValue}>{activeService.origenDireccion}</Text>
                </View>
                <View style={styles.routeCol}>
                  <Text style={[styles.routeLabel, { color: stateColors.accent }]}>DESTINO</Text>
                  <Text style={styles.routeValue}>{activeService.destinoDireccion}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: stateColors.divider }]} />

              {/* Service number / start time */}
              <View style={styles.routeRow}>
                <View style={styles.routeCol}>
                  <Text style={[styles.routeLabel, { color: stateColors.accent }]}>SERVICIO</Text>
                  <Text style={styles.routeValue}>#{activeService.numeroServicio}</Text>
                </View>
                <View style={styles.routeCol}>
                  <Text style={[styles.routeLabel, { color: stateColors.accent }]}>HORA DE INICIO</Text>
                  <Text style={styles.routeValue}>{activeService.HoraRecogida}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No hay servicio en tránsito en este momento.</Text>
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
                        color: isSelected ? palette.chartLine : isToday ? palette.chartBarToday : palette.textMuted,
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

          <Text style={styles.chartHint}>Toca una barra para ver el día del mes.</Text>
          {selectedDate !== null ? (
            <Text style={styles.selectedDayText}>Fecha: {selectedDate}</Text>
          ) : null}
        </Animated.View>

        </ScrollView>

        {role === 'PROPIETARIO' ? <OwnerBottomBar /> : null}
      </RoleGate>
    </View>
  );
}

function createStyles(palette: ScreenPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
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
    },
    headerSubtitle: {
      color: palette.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    themeToggle: {
      alignItems: 'center',
      backgroundColor: palette.surfaceAlt,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },

    /* ── Shared card ── */
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
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
      borderRadius: 14,
      flex: 1,
      gap: 4,
      minWidth: '44%',
      paddingVertical: 14,
    },
    statValue: {
      fontSize: 32,
      fontWeight: '800',
    },
    statLabel: {
      color: palette.textMuted,
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
      justifyContent: 'center',
    },
    transitTitleGroup: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    transitTitle: {
      color: palette.textStrong,
      fontSize: 20,
      fontWeight: '800',
    },
    badgePill: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    badgeText: {
      color: '#ffffff',
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
      gap: 1,
    },
    vehicleLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    vehicleValue: {
      color: palette.textStrong,
      fontSize: 17,
      fontWeight: '800',
    },
    companyValue: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    divider: {
      height: 1,
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
      color: palette.textStrong,
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
      borderWidth: 1,
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
      color: '#ffffff',
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