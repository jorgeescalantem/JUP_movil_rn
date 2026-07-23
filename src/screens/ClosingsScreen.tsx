import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export function ClosingsScreen() {
  const { services } = useSession();
  const defaultRange = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const handleFromDateChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    setFromDate(selectedDate.toISOString().slice(0, 10));
  };

  const handleToDateChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setShowToPicker(Platform.OS === 'ios');
    setToDate(selectedDate.toISOString().slice(0, 10));
  };

  const visibleServices = useMemo(
    () =>
      services.filter((service) => {
        if (service.estado !== 'TERMINADO' && service.estado !== 'COMPLETADO') {
          return false;
        }

        const serviceDate = toInputDate(service.fechaServicio);
        return serviceDate >= fromDate && serviceDate <= toDate;
      }),
    [fromDate, services, toDate],
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['PROPIETARIO']}>
        <SectionCard
          title="Detalle de servicios"
          subtitle="Filtra por fechas. Este rol solo permite consultar el detalle; no permite cierre por GuíaControl."
        >
          <View style={styles.dateFilterRow}>
            <View style={styles.dateFilterCol}>
              <Text style={styles.dateFilterLabel}>Desde</Text>
              <Pressable onPress={() => setShowFromPicker(true)} style={styles.dateInputPressable}>
                <Text style={styles.dateInputText}>{fromDate}</Text>
              </Pressable>
              {showFromPicker ? (
                <DateTimePicker
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  mode="date"
                  onDismiss={() => setShowFromPicker(false)}
                  onValueChange={handleFromDateChange}
                  value={parseInputDate(fromDate)}
                />
              ) : null}
            </View>
            <View style={styles.dateFilterCol}>
              <Text style={styles.dateFilterLabel}>Hasta</Text>
              <Pressable onPress={() => setShowToPicker(true)} style={styles.dateInputPressable}>
                <Text style={styles.dateInputText}>{toDate}</Text>
              </Pressable>
              {showToPicker ? (
                <DateTimePicker
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  mode="date"
                  onDismiss={() => setShowToPicker(false)}
                  onValueChange={handleToDateChange}
                  value={parseInputDate(toDate)}
                />
              ) : null}
            </View>
          </View>

          {visibleServices.map((service) => (
            <View key={service.numeroServicio} style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Servicio #{service.numeroServicio}</Text>
              <Text style={styles.detailText}>Estado: {service.estado}</Text>
              <Text style={styles.detailText}>Fecha: {toInputDate(service.fechaServicio)}</Text>
              <Text style={styles.detailText}>Cliente: {service.clienteNombre}</Text>
              <Text style={styles.detailText}>Compania: {service.companiaNombre}</Text>
              <Text style={styles.detailText}>Origen: {service.origenDireccion}</Text>
              <Text style={styles.detailText}>Destino: {service.destinoDireccion}</Text>

              <Text style={styles.detailText}>
                GuiaControl: {service.Guiacontrol ?? (service.estado === 'TERMINADO' ? 'Pendiente de cierre' : 'Sin registrar')}
              </Text>
            </View>
          ))}

          {visibleServices.length === 0 ? (
            <Text style={styles.emptyText}>No hay servicios para el filtro seleccionado.</Text>
          ) : null}
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
  dateFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateFilterCol: {
    flex: 1,
    gap: spacing.xs,
  },
  dateFilterLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateInputPressable: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateInputText: {
    color: colors.textStrong,
    fontSize: 14,
    fontWeight: '600',
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