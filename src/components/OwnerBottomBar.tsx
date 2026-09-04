import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Car, History, LayoutDashboard, type LucideIcon } from 'lucide-react-native';

import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

// Brand gradient reused across the app (submit buttons, app icon).
const BRAND_GRADIENT = ['#2fdeb0', '#1bbbe8', '#0fa0f3'] as const;

function GradientIcon({ icon: Icon, size = 18 }: { icon: LucideIcon; size?: number }) {
  const badgeSize = size + 20;
  return (
    <LinearGradient
      colors={BRAND_GRADIENT}
      end={{ x: 1, y: 0.5 }}
      start={{ x: 0, y: 0.5 }}
      style={[styles.iconBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}
    >
      <Icon color="#ffffff" size={size} />
    </LinearGradient>
  );
}

// Persistent quick-access footer shared by every PROPIETARIO screen for consistent navigation.
export function OwnerBottomBar() {
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { ownedVehicles, selectVehiculo } = useSession();
  const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false);

  return (
    <>
      <View style={styles.bottomBar}>
        <Pressable onPress={() => navigation.navigate('PropietarioHome')} style={styles.quickAction}>
          <GradientIcon icon={LayoutDashboard} size={18} />
          <Text numberOfLines={1} style={styles.quickActionLabel}>Inicio</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('EstadoDeServicios')} style={styles.quickAction}>
          <GradientIcon icon={BarChart3} size={18} />
          <Text numberOfLines={1} style={styles.quickActionLabel}>Resumen</Text>
        </Pressable>

        <Pressable
          disabled={ownedVehicles.length <= 1}
          onPress={() => setIsVehiclePickerOpen(true)}
          style={[styles.quickAction, ownedVehicles.length <= 1 ? styles.quickActionDisabled : null]}
        >
          <GradientIcon icon={Car} size={18} />
          <Text numberOfLines={1} style={styles.quickActionLabel}>Vehiculos</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ServiciosPrestados')} style={styles.quickAction}>
          <GradientIcon icon={History} size={18} />
          <Text numberOfLines={1} style={styles.quickActionLabel}>Historico</Text>
        </Pressable>
      </View>

      <Modal animationType="slide" onRequestClose={() => setIsVehiclePickerOpen(false)} transparent visible={isVehiclePickerOpen}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Selecciona un vehiculo</Text>
            <FlatList
              data={ownedVehicles}
              keyExtractor={(item) => String(item.codvehiculo)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    selectVehiculo(item.codvehiculo);
                    setIsVehiclePickerOpen(false);
                  }}
                  style={styles.vehicleOption}
                >
                  <GradientIcon icon={Car} size={14} />
                  <Text style={styles.vehicleOptionText}>{item.placa}</Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setIsVehiclePickerOpen(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bottomBar: {
    backgroundColor: colors.surface,
    elevation: 12,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  quickActionLabel: {
    color: colors.textStrong,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  vehicleOption: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  vehicleOptionText: {
    color: colors.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  modalCloseText: {
    color: colors.accent,
    fontWeight: '700',
  },
});
