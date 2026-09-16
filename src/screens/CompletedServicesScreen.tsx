import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { RoleGate } from '../components/RoleGate';
import { OwnerBottomBar } from '../components/OwnerBottomBar';
import { SectionCard } from '../components/SectionCard';
import { ServiceHistoryCard } from '../components/ServiceHistoryCard';
import { DrawerParamList } from '../navigation/AppDrawer';
import { fetchVehicleServiceHistory } from '../services/servicesApi';
import { useSession } from '../store/session';
import { spacing } from '../theme';
import { Service, SortKey } from '../types/domain';

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
  surfaceAlt: '#F1F5F9',
  muted: '#8B96AC',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderSoft: '#D9E1E8',
  success: '#10B981',
  successSoft: '#E7F8F1',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  neutralSoft: '#EEF1F6',
} as const;

const WEEKDAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_RANGE_DAYS = 30;

function last30DaysRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const date = parseInputDate(value);
  return `${date.getDate()} ${MONTH_ABBR[date.getMonth()]} ${date.getFullYear()}`;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function clampToSelectable(key: string, minKey: string, maxKey: string) {
  if (key < minKey) return minKey;
  if (key > maxKey) return maxKey;
  return key;
}

function getMonthMatrix(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    cells.push({ date: new Date(year, month, -i), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }

  const weeks: { date: Date; inMonth: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function currency(value: number) {
  return `$${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

// ─────────────────────────────────────────────────────────────
// KPI Card (misma estética que PropietarioHome)
// ─────────────────────────────────────────────────────────────
type KpiVariant = 'services' | 'amount' | 'copays';

const KPI_STYLE: Record<KpiVariant, { Icon: LucideIcon; color: string; bg: string }> = {
  services: { Icon: Receipt,    color: SCA.blue,    bg: SCA.blueSoft },
  amount:   { Icon: TrendingUp, color: SCA.success, bg: SCA.successSoft },
  copays:   { Icon: Wallet,     color: SCA.navy,    bg: SCA.neutralSoft },
};

function KpiCard({ variant, value, label }: { variant: KpiVariant; value: string; label: string }) {
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

type Props = DrawerScreenProps<DrawerParamList, 'ServiciosPrestados'>;

export function CompletedServicesScreen({ route }: Props) {
  const defaults = last30DaysRange();
  const maxSelectableKey = dateKey(new Date());
  const minSelectableKey = dateKey(addDays(new Date(), -(MAX_RANGE_DAYS - 1)));
  const { selectedVehiculo } = useSession();
  const [historyServices, setHistoryServices] = useState<Service[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [fromDateDraft, setFromDateDraft] = useState(route.params?.fromDate ?? defaults.from);
  const [toDateDraft, setToDateDraft] = useState(route.params?.toDate ?? defaults.to);
  const [fromDate, setFromDate] = useState<string | null>(
    route.params?.autoApply ? (route.params.fromDate ?? defaults.from) : null,
  );
  const [toDate, setToDate] = useState<string | null>(
    route.params?.autoApply ? (route.params.toDate ?? defaults.to) : null,
  );
  const [sortKeyDraft, setSortKeyDraft] = useState<SortKey | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => parseInputDate(fromDateDraft));
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // ─── Refs y estado para el auto-scroll al listado ──────────
  const scrollViewRef = useRef<ScrollView>(null);
  const serviceListYRef = useRef(0);
  const shouldScrollAfterLoadRef = useRef(false);

  const toggleFilterCollapsed = () => {
    setIsFilterCollapsed((prev) => !prev);
  };

  const openRangePicker = () => {
    setRangeAnchor(null);
    setCalendarMonth(parseInputDate(fromDateDraft));
    setShowRangePicker(true);
  };

  const closeRangePicker = () => {
    setRangeAnchor(null);
    setShowRangePicker(false);
  };

  const handleDayPress = (day: Date) => {
    const key = dateKey(day);
    if (key < minSelectableKey || key > maxSelectableKey) return;

    if (!rangeAnchor) {
      setRangeAnchor(key);
      setFromDateDraft(key);
      setToDateDraft(key);
      return;
    }

    const from = key < rangeAnchor ? key : rangeAnchor;
    const to = key < rangeAnchor ? rangeAnchor : key;
    setFromDateDraft(clampToSelectable(from, minSelectableKey, maxSelectableKey));
    setToDateDraft(clampToSelectable(to, minSelectableKey, maxSelectableKey));
    setRangeAnchor(null);
    setShowRangePicker(false);
  };

  const calendarWeeks = useMemo(() => getMonthMatrix(calendarMonth), [calendarMonth]);

  useEffect(() => {
    if (route.params?.autoApply) {
      const from = route.params.fromDate ?? defaults.from;
      const to = route.params.toDate ?? defaults.to;
      setFromDateDraft(from);
      setToDateDraft(to);
      setFromDate(from);
      setToDate(to);
      setSortKey(null);
      setSortKeyDraft(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params]);

  useEffect(() => {
    if (!selectedVehiculo || !fromDate || !toDate) {
      setHistoryServices([]);
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);

    fetchVehicleServiceHistory(selectedVehiculo.codvehiculo, fromDate, toDate)
      .then((result) => {
        if (result.ok) {
          setHistoryServices(result.services);
        } else {
          setHistoryError(result.message);
        }
      })
      .finally(() => setIsLoadingHistory(false));
  }, [selectedVehiculo, fromDate, toDate]);

  // ─── Auto-scroll al listado cuando termina la carga ────────
  useEffect(() => {
    if (!isLoadingHistory && shouldScrollAfterLoadRef.current) {
      shouldScrollAfterLoadRef.current = false;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          animated: true,
          y: Math.max(serviceListYRef.current - 16, 0),
        });
      }, 150);
    }
  }, [isLoadingHistory]);

  const completedServices = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const filtered = normalizedSearch
      ? historyServices.filter((service) =>
          [service.numeroServicio, service.clienteNombre, service.companiaNombre]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : historyServices;

    if (!sortKey) return filtered;

    return [...filtered].sort((left, right) => {
      if (sortKey === 'numeroServicio') {
        return Number(right.numeroServicio) - Number(left.numeroServicio);
      }
      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [historyServices, searchText, sortKey]);

  const totals = completedServices.reduce(
    (accumulator, service) => ({
      totalValue: accumulator.totalValue + service.valor,
      totalCopago: accumulator.totalCopago + service.copago,
      count: accumulator.count + 1,
    }),
    { totalValue: 0, totalCopago: 0, count: 0 },
  );

  const isRangeApplied = fromDate !== null && toDate !== null;

  const requestScrollToServiceList = () => {
    if (isLoadingHistory) {
      shouldScrollAfterLoadRef.current = true;
    } else {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          animated: true,
          y: Math.max(serviceListYRef.current - 16, 0),
        });
      }, 150);
    }
  };

  return (
    <View style={styles.screen}>
      <RoleGate allowedRoles={['PROPIETARIO', 'AMBOS']}>
        <ScrollView contentContainerStyle={styles.content} ref={scrollViewRef}>

          {/* ─── Filtro de fechas colapsable ───────────────── */}
          <Animated.View layout={LinearTransition.duration(220)}>
            <SectionCard centerTitle subtitle="" title="Historial de servicios">
              {/* Toggle principal: minimiza TODO el cuerpo */}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !isFilterCollapsed }}
                onPress={toggleFilterCollapsed}
                style={styles.filterToggleHeader}
              >
                <View style={styles.filterToggleHeaderLeft}>
                  <View style={styles.filterToggleIconWrap}>
                    <MaterialCommunityIcons color={SCA.blue} name="filter-variant" size={16} />
                  </View>
                  <View style={styles.filterToggleTextGroup}>
                    <Text style={styles.filterToggleTitle}>
                      {isFilterCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
                    </Text>
                    <Text numberOfLines={1} style={styles.filterToggleHint}>
                      {formatDisplayDate(fromDateDraft)} – {formatDisplayDate(toDateDraft)}
                    </Text>
                  </View>
                </View>
                {isFilterCollapsed ? (
                  <ChevronDown color={SCA.muted} size={18} strokeWidth={2.5} />
                ) : (
                  <ChevronUp color={SCA.muted} size={18} strokeWidth={2.5} />
                )}
              </Pressable>

              {/* Cuerpo colapsable */}
              {!isFilterCollapsed ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                  style={styles.filterBody}
                >
                  {/* Selector de rango colapsable */}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => (showRangePicker ? closeRangePicker() : openRangePicker())}
                    style={styles.collapsibleHeader}
                  >
                    <View style={styles.collapsibleHeaderLeft}>
                      <View style={styles.collapsibleIconWrap}>
                        <MaterialCommunityIcons
                          color={SCA.blue}
                          name="calendar-range-outline"
                          size={16}
                        />
                      </View>
                      <View style={styles.collapsibleHeaderText}>
                        <Text numberOfLines={1} style={styles.collapsibleHeaderTitle}>
                          {formatDisplayDate(fromDateDraft)} – {formatDisplayDate(toDateDraft)}
                        </Text>
                        <Text numberOfLines={1} style={styles.collapsibleHeaderHint}>
                          {showRangePicker ? 'Cerrar calendario' : 'Cambiar rango'}
                        </Text>
                      </View>
                    </View>
                    {showRangePicker ? (
                      <ChevronUp color={SCA.muted} size={16} strokeWidth={2.5} />
                    ) : (
                      <ChevronDown color={SCA.muted} size={16} strokeWidth={2.5} />
                    )}
                  </Pressable>

                  {/* Calendario expandible */}
                  {showRangePicker ? (
                    <Animated.View
                      entering={FadeIn.duration(180)}
                      exiting={FadeOut.duration(120)}
                      style={styles.pickerWrap}
                    >
                      <View style={styles.calendarHeader}>
                        <Pressable
                          hitSlop={8}
                          onPress={() => setCalendarMonth((current) => addMonths(current, -1))}
                          style={styles.calendarNavButton}
                        >
                          <MaterialCommunityIcons color={SCA.blue} name="chevron-left" size={18} />
                        </Pressable>
                        <Text style={styles.calendarMonthLabel}>
                          {MONTH_LABELS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => setCalendarMonth((current) => addMonths(current, 1))}
                          style={styles.calendarNavButton}
                        >
                          <MaterialCommunityIcons color={SCA.blue} name="chevron-right" size={18} />
                        </Pressable>
                      </View>

                      <View style={styles.weekDaysRow}>
                        {WEEKDAY_LABELS.map((label) => (
                          <Text key={label} style={styles.weekDayLabel}>{label}</Text>
                        ))}
                      </View>

                      {calendarWeeks.map((week, weekIndex) => (
                        <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                          {week.map(({ date, inMonth }) => {
                            const key = dateKey(date);
                            const isStart = key === fromDateDraft;
                            const isEnd = key === toDateDraft;
                            const isInRange = key > fromDateDraft && key < toDateDraft;
                            const isOutOfRange = key < minSelectableKey || key > maxSelectableKey;

                            return (
                              <Pressable
                                disabled={!inMonth || isOutOfRange}
                                key={key}
                                onPress={() => handleDayPress(date)}
                                style={[
                                  styles.dayCell,
                                  isInRange ? styles.dayCellInRange : null,
                                  isStart ? styles.dayCellEdgeStart : null,
                                  isEnd ? styles.dayCellEdgeEnd : null,
                                ]}
                              >
                                <View style={[styles.dayCellInner, (isStart || isEnd) ? styles.dayCellSelected : null]}>
                                  <Text
                                    style={[
                                      styles.dayText,
                                      (!inMonth || isOutOfRange) ? styles.dayTextDisabled : null,
                                      (isStart || isEnd) ? styles.dayTextSelected : null,
                                    ]}
                                  >
                                    {date.getDate()}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                      ))}
                    </Animated.View>
                  ) : null}

                  {/* Búsqueda */}
                  <View style={styles.filterRow}>
                    <TextInput
                      onChangeText={setSearchText}
                      placeholder="Buscar por No. de servicio, cliente o compañía"
                      placeholderTextColor={SCA.muted}
                      style={styles.searchInput}
                      value={searchText}
                    />
                  </View>

                  {/* Chips de orden */}
                  <View style={styles.chipsRow}>
                    {[
                      ['numeroServicio', 'No.'],
                      ['clienteNombre', 'Cliente'],
                      ['companiaNombre', 'Compañía'],
                    ].map(([key, label]) => {
                      const selected = sortKeyDraft === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setSortKeyDraft((current) => (current === key ? null : (key as SortKey)))}
                          style={[styles.chip, selected ? styles.chipActive : null]}
                        >
                          <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Aplicar */}
                  <Pressable
                    onPress={() => {
                      const from = clampToSelectable(fromDateDraft, minSelectableKey, maxSelectableKey);
                      const to = clampToSelectable(toDateDraft, minSelectableKey, maxSelectableKey);
                      setFromDateDraft(from);
                      setToDateDraft(to);
                      setFromDate(from);
                      setToDate(to);
                      setSortKey(sortKeyDraft);
                      requestScrollToServiceList();
                    }}
                    style={({ pressed }) => [
                      styles.applyFilterButton,
                      pressed && styles.applyFilterButtonPressed,
                    ]}
                  >
                    <Text style={styles.applyFilterButtonText}>Filtrar</Text>
                  </Pressable>
                </Animated.View>
              ) : null}
            </SectionCard>
          </Animated.View>

          {/* ─── Resumen del periodo (KPIs) ─────────────────── */}
          <View style={styles.kpiRow}>
            <KpiCard label="Servicios" value={String(totals.count)} variant="services" />
            <KpiCard label="Valor" value={currency(totals.totalValue)} variant="amount" />
            <KpiCard label="Copago" value={currency(totals.totalCopago)} variant="copays" />
          </View>

          {/* ─── Listado de servicios ───────────────────────── */}
          <View onLayout={(e) => { serviceListYRef.current = e.nativeEvent.layout.y; }}>
            <SectionCard
              subtitle={
                !isLoadingHistory && !historyError && completedServices.length > 0
                  ? `${completedServices.length} servicio${completedServices.length === 1 ? '' : 's'} en el rango`
                  : ''
              }
              title="Detalle de servicios prestados"
            >
              {isLoadingHistory ? (
                <View style={styles.feedbackCard}>
                  <ActivityIndicator color={SCA.blue} size="small" />
                  <Text style={styles.feedbackText}>Cargando servicios…</Text>
                </View>
              ) : null}

              {!isLoadingHistory && historyError ? (
                <View style={styles.errorBox}>
                  <AlertCircle color={SCA.danger} size={18} strokeWidth={2.5} />
                  <Text style={styles.errorText}>{historyError}</Text>
                </View>
              ) : null}

              {!isLoadingHistory && !historyError && completedServices.length > 0 ? (
                <View style={styles.serviceList}>
                  {completedServices.map((service) => (
                    <ServiceHistoryCard key={service.numeroServicio} service={service} />
                  ))}
                </View>
              ) : null}

              {!isLoadingHistory && !historyError && completedServices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <BarChart3 color={SCA.blue} size={26} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {isRangeApplied ? 'Sin resultados' : 'Aún no has filtrado'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {isRangeApplied
                      ? 'No hay servicios en el rango seleccionado. Prueba con otro rango de fechas.'
                      : 'Selecciona un rango de fechas y toca Filtrar para ver los servicios prestados.'}
                  </Text>
                </View>
              ) : null}
            </SectionCard>
          </View>
        </ScrollView>

        <OwnerBottomBar />
      </RoleGate>
    </View>
  );
}

const BOTTOM_BAR_OFFSET = 120;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SCA.surfaceSoft,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: BOTTOM_BAR_OFFSET,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // ─── Toggle principal (minimiza todo) ────────────────────
  filterToggleHeader: {
    alignItems: 'center',
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  filterToggleHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterToggleIconWrap: {
    alignItems: 'center',
    backgroundColor: SCA.blueSoft,
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  filterToggleTextGroup: {
    flex: 1,
    gap: 1,
  },
  filterToggleTitle: {
    color: SCA.navy,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterToggleHint: {
    color: SCA.muted,
    fontSize: 10,
    fontWeight: '500',
  },

  // ─── Cuerpo colapsable ───────────────────────────────────
  filterBody: {
    gap: 8,
    marginTop: 8,
  },

  // ─── Selector de rango colapsable ────────────────────────
  collapsibleHeader: {
    alignItems: 'center',
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  collapsibleHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  collapsibleIconWrap: {
    alignItems: 'center',
    backgroundColor: SCA.blueSoft,
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  collapsibleHeaderText: {
    flex: 1,
    gap: 1,
  },
  collapsibleHeaderTitle: {
    color: SCA.navy,
    fontSize: 12,
    fontWeight: '700',
  },
  collapsibleHeaderHint: {
    color: SCA.muted,
    fontSize: 10,
    fontWeight: '500',
  },

  // ─── Filtros ─────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  searchInput: {
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: SCA.navy,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  // ─── Calendario ──────────────────────────────────────────
  pickerWrap: {
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    overflow: 'hidden',
    padding: 6,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: SCA.surface,
    borderColor: SCA.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  calendarMonthLabel: {
    color: SCA.navy,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  weekDayLabel: {
    color: SCA.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 1,
  },
  dayCellInRange: {
    backgroundColor: SCA.blueSoft,
  },
  dayCellEdgeStart: {
    backgroundColor: SCA.blueSoft,
    borderBottomLeftRadius: 999,
    borderTopLeftRadius: 999,
  },
  dayCellEdgeEnd: {
    backgroundColor: SCA.blueSoft,
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
  },
  dayCellInner: {
    alignItems: 'center',
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  dayCellSelected: {
    backgroundColor: SCA.blue,
  },
  dayText: {
    color: SCA.navy,
    fontSize: 11,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: SCA.muted,
    opacity: 0.4,
  },
  dayTextSelected: {
    color: SCA.white,
  },

  // ─── Chips ───────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: SCA.blue,
    borderColor: SCA.blue,
  },
  chipText: {
    color: SCA.navy,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: SCA.white,
  },

  // ─── Apply button ────────────────────────────────────────
  applyFilterButton: {
    alignItems: 'center',
    backgroundColor: SCA.blue,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: SCA.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  applyFilterButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  applyFilterButtonText: {
    color: SCA.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ─── KPIs ─────────────────────────────────────────────────
  kpiRow: {
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

  // ─── Listado de servicios ─────────────────────────────────
  serviceList: {
    gap: 6,
  },

  // ─── Feedback (loading) ───────────────────────────────────
  feedbackCard: {
    alignItems: 'center',
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  feedbackText: {
    color: SCA.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Error ────────────────────────────────────────────────
  errorBox: {
    alignItems: 'center',
    backgroundColor: SCA.dangerSoft,
    borderRadius: 14,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: SCA.danger,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ─── Empty state ──────────────────────────────────────────
  emptyCard: {
    alignItems: 'center',
    backgroundColor: SCA.surfaceSoft,
    borderColor: SCA.border,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: SCA.blueSoft,
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    marginBottom: 4,
    width: 52,
  },
  emptyTitle: {
    color: SCA.navy,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: SCA.muted,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
});