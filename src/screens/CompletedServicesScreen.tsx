import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';
import { SortKey } from '../types/domain';

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

export function CompletedServicesScreen() {
  const defaults = currentMonthRange();
  const { services } = useSession();
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [sortKey, setSortKey] = useState<SortKey>('numeroServicio');

  const completedServices = useMemo(() => {
    return services
      .filter((service) => service.estado === 'COMPLETADO' || service.estado === 'procesado')
      .filter((service) => {
        const serviceDate = toInputDate(service.fechaServicio);
        return serviceDate >= fromDate && serviceDate <= toDate;
      })
      .sort((left, right) => {
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
        <SectionCard
          title="Resumen del mes"
          subtitle="Filtrado por fecha de servicio y estados completados o procesados."
          actionLabel="Mes actual"
          onPress={() => {
            const range = currentMonthRange();
            setFromDate(range.from);
            setToDate(range.to);
          }}
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

        <SectionCard title="Filtros y orden" subtitle="Base local para simular la consulta del backend.">
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Desde</Text>
              <TextInput onChangeText={setFromDate} style={styles.input} value={fromDate} />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.filterLabel}>Hasta</Text>
              <TextInput onChangeText={setToDate} style={styles.input} value={toDate} />
            </View>
          </View>

          <View style={styles.chipsRow}>
            {[
              ['numeroServicio', 'No'],
              ['clienteNombre', 'Cliente'],
              ['companiaNombre', 'Compania'],
            ].map(([key, label]) => {
              const selected = sortKey === key;

              return (
                <Pressable
                  key={key}
                  onPress={() => setSortKey(key as SortKey)}
                  style={[styles.chip, selected ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, selected ? styles.chipTextActive : null]}>{label}</Text>
                </Pressable>
              );
            })}
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
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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