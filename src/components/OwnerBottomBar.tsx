import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Car, History, LayoutDashboard, type LucideIcon } from 'lucide-react-native';

import { DrawerParamList } from '../navigation/AppDrawer';
import { useSession } from '../store/session';
import { colors, spacing } from '../theme';

// ─────────────────────────────────────────────────────────────
// SCA Soluciones brand palette (aligned with corporate identity)
// ─────────────────────────────────────────────────────────────
const SCA = {
  navy: '#1B2A4A',
  navyDeep: '#131E36',
  blue: '#0FA0F3',
  sky: '#7FB3D5',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  muted: '#8B96AC',
  border: '#E2E8F0',
} as const;

// Gradiente de marca para el tab activo (azul SCA).
const BRAND_GRADIENT = [SCA.sky, SCA.blue] as const;

function GradientIcon({ icon: Icon, size = 18 }: { icon: LucideIcon; size?: number }) {
  const badgeSize = size + 20;
  return (
    <LinearGradient
      colors={BRAND_GRADIENT}
      end={{ x: 1, y: 0.5 }}
      start={{ x: 0, y: 0.5 }}
      style={[styles.iconBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}
    >
      <Icon color={SCA.white} size={size} />
    </LinearGradient>
  );
}

// Solo rutas navegables reales del Drawer. `as const satisfies` preserva los
// literales de `key` para que `navigation.navigate(tab.key)` sea type-safe,
// pero valida contra `DrawerParamList` para evitar typos.
const NAV_TABS = [
  { key: 'PropietarioHome', label: 'Inicio', icon: LayoutDashboard },
  { key: 'EstadoDeServicios', label: 'Resumen', icon: BarChart3 },
  { key: 'ServiciosPrestados', label: 'Histórico', icon: History },
] as const satisfies ReadonlyArray<{
  key: keyof DrawerParamList;
  label: string;
  icon: LucideIcon;
}>;

function TabItem({
  icon: Icon,
  label,
  focused,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[styles.tabItem, disabled ? styles.tabItemDisabled : null]}
    >
      {focused ? (
        <GradientIcon icon={Icon} size={18} />
      ) : (
        <View style={styles.iconBadgeInactive}>
          <Icon color={SCA.muted} size={20} />
        </View>
      )}
      <Text numberOfLines={1} style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

// Persistent quick-access footer shared by every PROPIETARIO screen for consistent navigation.
export function OwnerBottomBar() {
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { ownedVehicles, selectVehiculo } = useSession();
  const [isVehiclePickerOpen, setIsVehiclePickerOpen] = useState(false);

  // Detecta la ruta activa para resaltar el tab correspondiente.
  const currentRoute = useNavigationState(
    (state) => state?.routes[state.index]?.name
  );

  return (
    <>
      <View style={styles.bottomBar}>
        {NAV_TABS.map((tab) => (
          <TabItem
            key={tab.label}
            focused={currentRoute === tab.key}
            icon={tab.icon}
            label={tab.label}
            onPress={() => navigation.navigate(tab.key)}
          />
        ))}

        <TabItem
          disabled={ownedVehicles.length <= 1}
          focused={isVehiclePickerOpen}
          icon={Car}
          label="Vehículos"
          onPress={() => setIsVehiclePickerOpen(true)}
        />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsVehiclePickerOpen(false)}
        transparent
        visible={isVehiclePickerOpen}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Selecciona un vehículo</Text>
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
  iconBadgeInactive: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    width: 38,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: SCA.surface,
    borderTopColor: SCA.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: SCA.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tabItemDisabled: {
    opacity: 0.35,
  },
  tabLabel: {
    color: SCA.muted,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 13,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: SCA.navy,
    fontWeight: '700',
  },
  modalOverlay: {
    backgroundColor: 'rgba(19, 30, 54, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: SCA.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: spacing.lg,
    shadowColor: SCA.navy,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  modalTitle: {
    color: SCA.navy,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  vehicleOption: {
    alignItems: 'center',
    borderBottomColor: SCA.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  vehicleOptionText: {
    color: SCA.navy,
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  modalCloseText: {
    color: SCA.blue,
    fontWeight: '700',
  },
});