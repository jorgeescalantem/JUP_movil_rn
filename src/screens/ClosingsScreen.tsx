import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RoleGate } from '../components/RoleGate';
import { SectionCard } from '../components/SectionCard';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

type ClosingsFilter = 'TERMINADO' | 'COMPLETADO';

function toInputDate(isoValue: string) {
  return new Date(isoValue).toISOString().slice(0, 10);
}

export function ClosingsScreen() {
  const { services, closeService } = useSession();
  const [selectedFilter, setSelectedFilter] = useState<ClosingsFilter>('TERMINADO');
  const [guides, setGuides] = useState<Record<string, string>>({});

  const terminadoServices = useMemo(
    () => services.filter((service) => service.estado === 'TERMINADO'),
    [services],
  );
  const completedServices = useMemo(
    () => services.filter((service) => service.estado === 'COMPLETADO'),
    [services],
  );
  const visibleServices = selectedFilter === 'TERMINADO' ? terminadoServices : completedServices;
  const totalForChart = Math.max(terminadoServices.length + completedServices.length, 1);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <RoleGate allowedRoles={['PROPIETARIO']}>
        <SectionCard title="Cierres" subtitle="Drilldown local para terminados y completados de los ultimos movimientos.">
          <View style={styles.chartRow}>
            <Pressable
              onPress={() => setSelectedFilter('TERMINADO')}
              style={[
                styles.chartSegment,
                styles.chartSegmentWarning,
                { flex: terminadoServices.length / totalForChart || 1 },
              ]}
            >
              <Text style={styles.chartTitle}>Terminados</Text>
              <Text style={styles.chartValue}>{terminadoServices.length}</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedFilter('COMPLETADO')}
              style={[
                styles.chartSegment,
                styles.chartSegmentSuccess,
                { flex: completedServices.length / totalForChart || 1 },
              ]}
            >
              <Text style={styles.chartTitle}>Completados</Text>
              <Text style={styles.chartValue}>{completedServices.length}</Text>
            </Pressable>
          </View>

          <Text style={styles.helperText}>Toca un segmento para cambiar la lista filtrada.</Text>
        </SectionCard>

        <SectionCard
          title={selectedFilter === 'TERMINADO' ? 'Lista de terminados' : 'Lista de completados'}
          subtitle="En terminados puedes capturar Guiacontrol y cerrar el servicio."
        >
          {visibleServices.map((service) => (
            <View key={service.numeroServicio} style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Servicio #{service.numeroServicio}</Text>
              <Text style={styles.detailText}>Fecha: {toInputDate(service.fechaServicio)}</Text>
              <Text style={styles.detailText}>Cliente: {service.clienteNombre}</Text>
              <Text style={styles.detailText}>Compania: {service.companiaNombre}</Text>
              <Text style={styles.detailText}>Origen: {service.origenDireccion}</Text>
              <Text style={styles.detailText}>Destino: {service.destinoDireccion}</Text>

              {selectedFilter === 'TERMINADO' ? (
                <>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => setGuides((current) => ({ ...current, [service.numeroServicio]: value }))}
                    placeholder="Guiacontrol"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={guides[service.numeroServicio] ?? ''}
                  />
                  <Pressable
                    onPress={() => {
                      const result = closeService(service.numeroServicio, guides[service.numeroServicio] ?? '');

                      if (!result.ok) {
                        Alert.alert('No fue posible cerrar', result.message ?? 'Intenta nuevamente.');
                        return;
                      }

                      setGuides((current) => ({ ...current, [service.numeroServicio]: '' }));
                      Alert.alert('Servicio cerrado', 'El estado cambio a COMPLETADO.');
                    }}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.detailText}>Guia: {service.Guiacontrol ?? 'Sin registrar'}</Text>
              )}
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
  chartRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chartSegment: {
    borderRadius: 18,
    minHeight: 120,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  chartSegmentWarning: {
    backgroundColor: '#78350f',
  },
  chartSegmentSuccess: {
    backgroundColor: colors.accentSoft,
  },
  chartTitle: {
    color: colors.textStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  chartValue: {
    color: colors.textStrong,
    fontSize: 32,
    fontWeight: '700',
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
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
  input: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textStrong,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
  },
});