import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from '../store/session';
import { spacing, useTheme, type ThemeColors } from '../theme';

export function SelectVehicleScreen() {
  const { ownedVehicles, selectVehiculo } = useSession();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Selecciona un vehiculo</Text>
        <MaterialCommunityIcons color={colors.blue} name="car-multiple" size={30} />
      </View>

      <Text style={styles.subtitle}>
        Tienes varios vehiculos asociados. Elige la placa con la que deseas continuar.
      </Text>

      <FlatList
        contentContainerStyle={styles.list}
        data={ownedVehicles}
        keyExtractor={(item) => String(item.codvehiculo)}
        renderItem={({ item }) => (
          <Pressable onPress={() => selectVehiculo(item.codvehiculo)} style={styles.card}>
            <MaterialCommunityIcons color={colors.blue} name="car" size={24} />
            <Text style={styles.plate}>{item.placa}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    screenTitle: {
      color: colors.textStrong,
      fontSize: 24,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
    },
    list: {
      gap: spacing.sm,
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
    },
    plate: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 1,
    },
  });
}
