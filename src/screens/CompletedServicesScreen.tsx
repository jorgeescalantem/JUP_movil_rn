import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';
import { SortKey } from '../types/domain';

const WEEKDAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function last30DaysRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 29);

  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
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
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const weeks: { date: Date; inMonth: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

function currency(value: number) {
  return `$ ${value.toLocaleString('es-CO')}`;
}

type Props = DrawerScreenProps<DrawerParamList, 'ServiciosPrestados'>;

export function CompletedServicesScreen({ route }: Props) {
  const defaults = last30DaysRange();
  const { services } = useSession();
  const [fromDateDraft, setFromDateDraft] = useState(route.params?.fromDate ?? defaults.from);
  const [toDateDraft, setToDateDraft] = useState(route.params?.toDate ?? defaults.to);
  const [fromDate, setFromDate] = useState<string | null>(route.params?.autoApply ? (route.params.fromDate ?? defaults.from) : null);
  const [toDate, setToDate] = useState<string | null>(route.params?.autoApply ? (route.params.toDate ?? defaults.to) : null);
  const [sortKeyDraft, setSortKeyDraft] = useState<SortKey | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => parseInputDate(fromDateDraft));

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

    if (!rangeAnchor) {
      setRangeAnchor(key);
      setFromDateDraft(key);
      setToDateDraft(key);
      return;
    }

    if (key < rangeAnchor) {
      setFromDateDraft(key);
      setToDateDraft(rangeAnchor);
    } else {
      setFromDateDraft(rangeAnchor);
      setToDateDraft(key);
    }

    setRangeAnchor(null);
    setShowRangePicker(false);
  };

  const calendarWeeks = useMemo(() => getMonthMatrix(calendarMonth), [calendarMonth]);

  // Cuando se navega con autoApply aplica el rango recibido
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

  const completedServices = useMemo(() => {
    const base = services.filter((service) => service.estado === 'COMPLETADO' || service.estado === 'procesado');

    const filtered = fromDate && toDate
      ? base.filter((service) => {
          const serviceDate = toInputDate(service.fechaServicio);
          return serviceDate >= fromDate && serviceDate <= toDate;
        })
      : base;

    if (!sortKey) return filtered;

    return [...filtered].sort((left, right) => {
      if (sortKey === 'numeroServicio') {
        return Number(right.numeroServicio) - Number(left.numeroServicio);
      }

      return left[sortKey].localeCompare(right[sortKey]);
    });
  }, [fromDate, services, sortKey, toDate]);

  const totals = completedServices.reduce(
    (accumulator, service) => ({
      totalValue: accumulator.totalValue + service.valor,
      totalCopago: accumulator.totalCopago + service.copago,
      count: accumulator.count + 1,
    }),
    { totalValue: 0, totalCopago: 0, count: 0 },
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['PROPIETARIO']}>
        <SectionCard centerTitle title="Ver servicios Prestados" subtitle="">
          <View style={styles.filterRow}>
            <Pressable onPress={openRangePicker} style={styles.dateInputButton}>
              <View style={styles.dateInputInner}>
                <MaterialCommunityIcons color={colors.accent} name="calendar-range-outline" size={18} />
                <Text style={styles.dateInputText}>
                  {formatDisplayDate(fromDateDraft)} - {formatDisplayDate(toDateDraft)}
                </Text>
              </View>
            </Pressable>
          </View>

          {showRangePicker ? (
            <View style={styles.pickerWrap}>
              <View style={styles.calendarHeader}>
                <Pressable
                  hitSlop={8}
                  onPress={() => setCalendarMonth((current) => addMonths(current, -1))}
                  style={styles.calendarNavButton}
                >
                  <MaterialCommunityIcons color={colors.accent} name="chevron-left" size={22} />
                </Pressable>
                <Text style={styles.calendarMonthLabel}>
                  {MONTH_LABELS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setCalendarMonth((current) => addMonths(current, 1))}
                  style={styles.calendarNavButton}
                >
                  <MaterialCommunityIcons color={colors.accent} name="chevron-right" size={22} />
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

                    return (
                      <Pressable
                        disabled={!inMonth}
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
                              !inMonth ? styles.dayTextDisabled : null,
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

              <Pressable onPress={closeRangePicker} style={styles.calendarCloseButton}>
                <Text style={styles.calendarCloseButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.chipsRow}>
            {[
              ['numeroServicio', 'No'],
              ['clienteNombre', 'Cliente'],
              ['companiaNombre', 'Compania'],
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

          <Pressable
            onPress={() => {
              setFromDate(fromDateDraft);
              setToDate(toDateDraft);
              setSortKey(sortKeyDraft);
            }}
            style={styles.applyFilterButton}
          >
            <Text style={styles.applyFilterButtonText}>Filtrar</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          centerTitle
          title="Resumen del Periodo"
          subtitle="Servicios en estado completado por el vehículo."
        >
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totals.count}</Text>
              <Text style={styles.summaryLabel}>Servicios</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{currency(totals.totalValue)}</Text>
              <Text style={styles.summaryLabel}>Valor</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{currency(totals.totalCopago)}</Text>
              <Text style={styles.summaryLabel}>Copago</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Detalle de Servicios prestados" subtitle="Vista detallada de servicios completados en el rango seleccionado">
          {completedServices.map((service) => (
            <View key={service.numeroServicio} style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Servicio #{service.numeroServicio}</Text>
              <Text style={styles.detailText}>Cliente: {service.clienteNombre}</Text>
              <Text style={styles.detailText}>Compania: {service.companiaNombre}</Text>
              <Text style={styles.detailText}>Fecha: {toInputDate(service.fechaServicio)}</Text>
              <Text style={styles.detailText}>Origen: {service.origenDireccion}</Text>
              <Text style={styles.detailText}>Destino: {service.destinoDireccion}</Text>
              <Text style={styles.detailText}>Valor: {currency(service.valor)}</Text>
              <Text style={styles.detailText}>Copago: {currency(service.copago)}</Text>
              <Text style={styles.detailText}>Estado: {service.estado}</Text>
              <Text style={styles.detailText}>Guia: {service.Guiacontrol ?? 'Sin registrar'}</Text>
            </View>
          ))}

          {completedServices.length === 0 ? <Text style={styles.emptyText}>No hay servicios en el rango seleccionado.</Text> : null}
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
  summaryGrid: {
    gap: spacing.sm,
  },
  summaryItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    padding: spacing.md,
  },
  summaryValue: {
    color: colors.textStrong,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateInputButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateInputInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingLeft: spacing.lg,
  },
  dateInputText: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerWrap: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  calendarMonthLabel: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  weekDayLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 15,
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
    paddingVertical: 2,
  },
  dayCellInRange: {
    backgroundColor: colors.accentSoft,
  },
  dayCellEdgeStart: {
    backgroundColor: colors.accentSoft,
    borderBottomLeftRadius: 999,
    borderTopLeftRadius: 999,
  },
  dayCellEdgeEnd: {
    backgroundColor: colors.accentSoft,
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
  },
  dayCellInner: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
  },
  dayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.muted,
    opacity: 0.4,
  },
  dayTextSelected: {
    color: colors.background,
  },
  calendarCloseButton: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  calendarCloseButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.background,
  },
  applyFilterButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
  },
  applyFilterButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  serviceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  serviceTitle: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  detailText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
});