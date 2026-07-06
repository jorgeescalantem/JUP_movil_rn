import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';
import { SortKey } from '../types/domain';

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
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const openFromPicker = () => {
    setShowToPicker(false);
    setShowFromPicker(true);
  };

  const openToPicker = () => {
    setShowFromPicker(false);
    setShowToPicker(true);
  };

  const handleFromDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowFromPicker(false);
    if (event.type === 'set' && selectedDate) {
      setFromDateDraft(selectedDate.toISOString().slice(0, 10));
    }
  };

  const handleToDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowToPicker(false);
    if (event.type === 'set' && selectedDate) {
      setToDateDraft(selectedDate.toISOString().slice(0, 10));
    }
  };

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
        <SectionCard title="Filtros y orden" subtitle="Selecciona el periodo con calendario y organiza la consulta.">
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Desde</Text>
              <Pressable onPress={openFromPicker} style={styles.dateInputButton}>
                <View style={styles.dateInputInner}>
                  <MaterialCommunityIcons color={colors.accent} name="calendar-month-outline" size={18} />
                  <Text style={styles.dateInputText}>{fromDateDraft}</Text>
                </View>
              </Pressable>
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Hasta</Text>
              <Pressable onPress={openToPicker} style={styles.dateInputButton}>
                <View style={styles.dateInputInner}>
                  <MaterialCommunityIcons color={colors.accent} name="calendar-month-outline" size={18} />
                  <Text style={styles.dateInputText}>{toDateDraft}</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {showFromPicker ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                accentColor={colors.accent}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                mode="date"
                onChange={handleFromDateChange}
                textColor={colors.textStrong}
                value={parseInputDate(fromDateDraft)}
              />
            </View>
          ) : null}

          {showToPicker ? (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                accentColor={colors.accent}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                mode="date"
                onChange={handleToDateChange}
                textColor={colors.textStrong}
                value={parseInputDate(toDateDraft)}
              />
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
          title="Resumen del mes"
          subtitle="Filtrado por fecha de servicio y estados completados o procesados."
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

        <SectionCard title="Servicios prestados" subtitle="Vista detallada solo lectura para propietario.">
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
  filterField: {
    flex: 1,
    gap: spacing.xs,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  dateInputButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateInputInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
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
    paddingHorizontal: spacing.sm,
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