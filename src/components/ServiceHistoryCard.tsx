import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { spacing } from '../theme';
import { Service } from '../types/domain';

// ─────────────────────────────────────────────────────────────
// SCA Soluciones brand palette
// ─────────────────────────────────────────────────────────────
const SCA = {
  navy: '#1B2A4A',
  blue: '#0FA0F3',
  blueSoft: '#E6F4FD',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  muted: '#8B96AC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  neutralSoft: '#EEF1F6',
} as const;

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

export function ServiceHistoryCard({ service }: { service: Service }) {
  return (
    <View style={styles.card}>
      {/* Acento lateral azul */}
      <View style={styles.accentBar} />

      <View style={styles.cardContent}>
        {/* Header: fecha + chip #servicio */}
        <View style={styles.header}>
          <View style={styles.dateRow}>
            <View style={styles.bullet} />
            <Text numberOfLines={1} style={styles.dateText}>
              {formatDateTime(service.fechaServicio)}
            </Text>
          </View>
          <View style={styles.numberChip}>
            <Text numberOfLines={1} style={styles.numberChipText}>
              #{service.numeroServicio}
            </Text>
          </View>
        </View>

        {/* Ruta: origen → destino */}
        <View style={styles.routeBlock}>
          <View style={styles.routeItem}>
            <View style={[styles.routeIconWrap, styles.routeIconOrigin]}>
              <MaterialCommunityIcons color={SCA.blue} name="map-marker-outline" size={12} />
            </View>
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Origen</Text>
              <Text numberOfLines={2} style={styles.routeValue}>
                {service.origenDireccion}
              </Text>
            </View>
          </View>

          <View style={styles.routeItem}>
            <View style={[styles.routeIconWrap, styles.routeIconDest]}>
              <MaterialCommunityIcons color={SCA.navy} name="navigation-variant-outline" size={12} />
            </View>
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text numberOfLines={2} style={styles.routeValue}>
                {service.destinoDireccion}
              </Text>
            </View>
          </View>
        </View>

        {/* Meta en una sola fila compacta: Cliente | Compañía */}
        <View style={styles.metaBlock}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {service.clienteNombre}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Compañía</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {service.companiaNombre}
            </Text>
          </View>
        </View>

        {/* Guía (solo si existe) */}
        {service.Guiacontrol ? (
          <View style={styles.metaRowSingle}>
            <Text style={styles.metaLabel}>Guía</Text>
            <Text numberOfLines={1} style={styles.metaValue}>
              {service.Guiacontrol}
            </Text>
          </View>
        ) : null}

        {/* Footer: valor + copago */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Valor</Text>
            <Text style={styles.footerValue}>{currency(service.valor)}</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Copago</Text>
            <Text style={styles.footerValue}>{currency(service.copago)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SCA.surface,
    borderColor: SCA.borderStrong,           // 👈 borde más notorio
    borderRadius: 16,
    borderWidth: 1,                          // 👈 grosor visible
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: SCA.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,                     // 👈 sombra un poco más marcada
    shadowRadius: 8,
  },

  // Acento lateral azul SCA (marca visual de "servicio")
  accentBar: {
    backgroundColor: SCA.blue,
    width: 4,                                // 👈 barra delgada de color
  },

  cardContent: {
    flex: 1,
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  // ─── Header ────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
  },
  bullet: {
    backgroundColor: SCA.blue,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  dateText: {
    color: SCA.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  numberChip: {
    backgroundColor: SCA.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  numberChipText: {
    color: SCA.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ─── Ruta ──────────────────────────────────────────────────
  routeBlock: {
    gap: 4,
  },
  routeItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  routeIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  routeIconOrigin: {
    backgroundColor: SCA.blueSoft,
  },
  routeIconDest: {
    backgroundColor: SCA.neutralSoft,
  },
  routeTextWrap: {
    flex: 1,
    gap: 0,
  },
  routeLabel: {
    color: SCA.muted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  routeValue: {
    color: SCA.navy,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },

  // ─── Meta ──────────────────────────────────────────────────
  metaBlock: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flex: 1,
    gap: 0,
  },
  metaRowSingle: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaLabel: {
    color: SCA.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: SCA.navy,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  metaDivider: {
    backgroundColor: SCA.border,
    width: StyleSheet.hairlineWidth,
  },

  // ─── Footer ────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    borderTopColor: SCA.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  footerItem: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 0,
  },
  footerLabel: {
    color: SCA.muted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footerValue: {
    color: SCA.navy,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  footerDivider: {
    backgroundColor: SCA.border,
    height: 20,
    marginHorizontal: spacing.sm,
    width: StyleSheet.hairlineWidth,
  },
});