import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';

import { RoleGate } from '../components/RoleGate';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

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
const BAR_AREA_H = 90; // px — bar drawing area height

type StatConfig = {
  key: string;
  label: string;
  bg: string;
  numColor: string;
};

const STAT_CONFIGS: StatConfig[] = [
  { key: 'ASIGNADA',    label: 'ASIGNADO',    bg: '#dbeeff', numColor: '#006493' },
  { key: 'EN_TRANSITO', label: 'EN TRÁNSITO', bg: '#fff8dc', numColor: '#b07800' },
  { key: 'TERMINADO',   label: 'TERMINADO',   bg: '#f4f4f4', numColor: '#444' },
  { key: 'COMPLETADO',  label: 'COMPLETADO',  bg: '#d9f5e8', numColor: '#1a7a4e' },
];

export function ServiceStatusScreen() {
  const { activeService, statusCounts } = useSession();

  const { width: screenWidth } = useWindowDimensions();
  const [filter, setFilter] = useState<FilterKey>('7');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const chartData = MOCK_DATA[filter];
  const maxCount  = Math.max(...chartData.map((d) => d.count), 1);
  const chartW    = screenWidth - H_PADDING;
  const slotW     = chartW / chartData.length;
  const barW      = Math.max(6, slotW * 0.55);

  const barHeight = (count: number) => Math.max(6, (count / maxCount) * BAR_AREA_H);
  const barCenterX = (i: number) => i * slotW + slotW / 2;
  const barTopY    = (count: number) => BAR_AREA_H - barHeight(count);

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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['CONDUCTOR', 'PROPIETARIO']}>

        {/* ── Card 1: Estado de servicios ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen Diario</Text>
          <Text style={styles.cardSubtitle}>
            vista general de estado de servicios.
          </Text>

          <View style={styles.statsGrid}>
            {STAT_CONFIGS.map(({ key, label, bg, numColor }) => (
              <View key={key} style={[styles.statBox, { backgroundColor: bg }]}>
                <Text style={[styles.statValue, { color: numColor }]}>
                  {(statusCounts as Record<string, number>)[key] ?? 0}
                </Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Card 2: Servicio en tránsito ── */}
        <View style={[styles.card, styles.transitCard]}>
          <View style={styles.transitHeader}>
            <Text style={styles.transitTitle}>Servicio en tránsito</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {activeService ? (
            <>
              {/* Vehicle row */}
              <View style={styles.vehicleRow}>
                <MaterialCommunityIcons name="truck-outline" size={22} color="#006493" />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleLabel}>VEHÍCULO</Text>
                  <Text style={styles.vehicleValue}>{activeService.contrato}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Origin / destination */}
              <View style={styles.routeRow}>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>ORIGEN</Text>
                  <Text style={styles.routeValue}>{activeService.origenDireccion}</Text>
                </View>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>DESTINO</Text>
                  <Text style={styles.routeValue}>{activeService.destinoDireccion}</Text>
                </View>
              </View>

              {/* CTA button */}
              <TouchableOpacity style={styles.detailBtn} activeOpacity={0.85}>
                <Text style={styles.detailBtnText}>Ver Detalles del Viaje  →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>No hay servicio en tránsito en este momento.</Text>
          )}
        </View>

        {/* ── Card 3: Histórico de servicios ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Histórico de servicios</Text>

          {/* ── Filter toggle ── */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>FILTRAR:</Text>
            <View style={styles.filterGroup}>
              {FILTER_OPTS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
                  onPress={() => {
                    setFilter(key);
                    setSelectedBarIndex(null);
                    setSelectedDate(null);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterBtnText, filter === key && styles.filterBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Bars (absolute-positioned) ── */}
          <View style={[styles.barsContainer, { width: chartW, height: BAR_AREA_H }]}>
            {/* Trend line segments */}
            {chartData.slice(0, -1).map((item, i) => {
              const x1 = barCenterX(i);
              const y1 = barTopY(item.count);
              const x2 = barCenterX(i + 1);
              const y2 = barTopY(chartData[i + 1].count);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`tl-${i}`}
                  style={{
                    position: 'absolute',
                    width: len,
                    height: 2,
                    backgroundColor: '#ff6424',
                    left: (x1 + x2) / 2 - len / 2,
                    top: (y1 + y2) / 2 - 1,
                    transform: [{ rotate: `${angle}deg` }],
                    zIndex: 2,
                  }}
                />
              );
            })}

            {/* Trend line dots */}
            {chartData.map((item, i) => (
              <View
                key={`dot-${i}`}
                style={{
                  position: 'absolute',
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: '#ff6424',
                  borderWidth: 1.5,
                  borderColor: '#fff',
                  left: barCenterX(i) - 3.5,
                  top: barTopY(item.count) - 3.5,
                  zIndex: 3,
                }}
              />
            ))}

            {/* Bars */}
            {chartData.map((item, i) => {
              const bH = barHeight(item.count);
              const isToday = i === highlightIdx;
              const isSelected = i === selectedBarIndex;
              return (
                <TouchableOpacity
                  key={`bar-${i}`}
                  onPress={() => {
                    setSelectedBarIndex(i);
                    setSelectedDate(getDateForBar(i));
                  }}
                  activeOpacity={0.8}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: barCenterX(i) - barW / 2,
                    width: barW,
                    height: bH,
                    backgroundColor: isToday ? '#1a6b43' : '#006493',
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#ff6424' : isToday ? '#0f4a2c' : '#00426a',
                    borderRadius: 5,
                    zIndex: 1,
                  }}
                />
              );
            })}

            {/* Count labels above bars */}
            {chartData.map((item, i) => {
              const bH = barHeight(item.count);
              const isToday = i === highlightIdx;
              return (
                <Text
                  key={`cnt-${i}`}
                  style={{
                    position: 'absolute',
                    bottom: bH + 3,
                    left: barCenterX(i) - slotW / 2,
                    width: slotW,
                    textAlign: 'center',
                    fontSize: filter === '30' ? 7 : 10,
                    fontWeight: '700',
                    color: isToday ? '#1a6b43' : '#006493',
                    zIndex: 4,
                  }}
                >
                  {item.count}
                </Text>
              );
            })}
          </View>

          {/* ── Day labels row ── */}
          <View style={{ flexDirection: 'row', width: chartW }}>
            {chartData.map((item, i) => {
              const isToday = i === highlightIdx;
              // For 30-day view, only show label every 5th bar
              const showLabel = filter === '30' ? i % 5 === 0 : true;
              return (
                <View key={`dl-${i}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: filter === '30' ? 8 : filter === '15' ? 9 : 10,
                      fontWeight: isToday ? '800' : '600',
                      color: isToday ? '#1a6b43' : '#777',
                      opacity: showLabel ? 1 : 0,
                    }}
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
        </View>

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

  /* ── Shared card ── */
  card: {
    backgroundColor: colors.surface,
    borderColor: '#e0e7ef',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: '#121417',
    fontSize: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#4a5568',
    fontSize: 14,
    lineHeight: 20,
    marginTop: -spacing.xs,
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
    minWidth: '44%',
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  /* ── Transit card ── */
  transitCard: {
    backgroundColor: '#eaf4ff',
    borderColor: '#c3ddf5',
  },
  transitHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  transitTitle: {
    color: '#121417',
    fontSize: 20,
    fontWeight: '800',
  },
  liveBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liveText: {
    color: '#fff',
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
    color: '#006493',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  vehicleValue: {
    color: '#121417',
    fontSize: 17,
    fontWeight: '800',
  },
  divider: {
    backgroundColor: '#c3ddf5',
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
    color: '#006493',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  routeValue: {
    color: '#121417',
    fontSize: 14,
    lineHeight: 20,
  },
  detailBtn: {
    alignItems: 'center',
    backgroundColor: '#1a6b43',
    borderRadius: 30,
    marginTop: 4,
    paddingVertical: 14,
  },
  detailBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#4a5568',
    fontSize: 15,
    lineHeight: 22,
  },

  /* ── Filter row ── */
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
  },
  filterLabel: {
    color: '#555',
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
    borderColor: '#ccc',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterBtnActive: {
    backgroundColor: '#006493',
    borderColor: '#006493',
  },
  filterBtnText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  barsContainer: {
    marginTop: 8,
    position: 'relative',
  },
  chartHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  selectedDayText: {
    color: '#121417',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});