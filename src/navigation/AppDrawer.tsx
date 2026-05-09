import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
  createDrawerNavigator,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ClosingsScreen } from '../screens/ClosingsScreen';
import { CompletedServicesScreen } from '../screens/CompletedServicesScreen';
import { PropietarioHomeScreen } from '../screens/PropietarioHomeScreen';
import { ServiceDetailScreen } from '../screens/ServiceDetailScreen';
import { ServiceStatusScreen } from '../screens/ServiceStatusScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { colors, spacing } from '../theme';
import { Role } from '../types/domain';
import { useSession } from '../store/session';

export type DrawerParamList = {
  EstadoDeServicios: undefined;
  Servicios: undefined;
  ServicioDetalle: { serviceNumber: string };
  PropietarioHome: undefined;
  Cierres: undefined;
  ServiciosPrestados: { fromDate?: string; toDate?: string; autoApply?: boolean } | undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.accent,
    text: colors.textStrong,
  },
};

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { role, setRole, resetSession } = useSession();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <Image source={require('../../assets/logo1.png')} style={styles.logo} />
        <Text style={styles.drawerEyebrow}>JUP movil</Text>
        <Text style={styles.drawerTitle}>Acciones</Text>
        <Text style={styles.drawerText}>Intercambiar entre roles para navegar.</Text>
      </View>

      <View style={styles.roleSwitch}>
        {(['CONDUCTOR', 'PROPIETARIO'] as Role[]).map((item) => {
          const isActive = item === role;
          const iconName = item === 'CONDUCTOR' ? 'steering' : 'account-tie';

          return (
            <Pressable
              key={item}
              onPress={() => setRole(item)}
              style={[styles.roleButton, isActive ? styles.roleButtonActive : null]}
            >
              <MaterialCommunityIcons
                color={isActive ? '#ffffff' : '#334155'}
                name={iconName}
                size={18}
              />
              <Text style={[styles.roleButtonText, isActive ? styles.roleButtonTextActive : null]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.drawerList}>
        <DrawerItemList {...props} />
      </View>

      <DrawerItem
        label="Cerrar sesion"
        labelStyle={styles.logoutLabel}
        onPress={resetSession}
        style={styles.logoutItem}
      />
    </DrawerContentScrollView>
  );
}

export function AppDrawer() {
  const { role } = useSession();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Drawer.Navigator
        initialRouteName="Servicios"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerActiveBackgroundColor: colors.accentSoft,
          drawerActiveTintColor: colors.textStrong,
          drawerInactiveTintColor: colors.muted,
          drawerStyle: styles.drawer,
          headerStyle: styles.header,
          headerTintColor: colors.textStrong,
          sceneStyle: styles.scene,
        }}
      >
        {role === 'CONDUCTOR' ? (
          <>
            <Drawer.Screen
              component={ServicesScreen}
              name="Servicios"
              options={{ title: 'Servicios', drawerLabel: 'Servicios' }}
            />
            <Drawer.Screen
              component={ServiceStatusScreen}
              name="EstadoDeServicios"
              options={{ title: 'Estado de servicios', drawerLabel: 'Estado de servicios' }}
            />
            <Drawer.Screen
              component={ServiceDetailScreen}
              name="ServicioDetalle"
              options={{
                title: 'Detalle del servicio',
                drawerItemStyle: { display: 'none' },
              }}
            />
          </>
        ) : (
          <>
            <Drawer.Screen
              component={PropietarioHomeScreen}
              name="PropietarioHome"
              options={{ title: 'Inicio', drawerLabel: 'Inicio' }}
            />
            <Drawer.Screen
              component={ClosingsScreen}
              name="Cierres"
              options={{ title: 'Cierres', drawerLabel: 'Cierres' }}
            />
            <Drawer.Screen
              component={CompletedServicesScreen}
              name="ServiciosPrestados"
              options={{ title: 'Servicios prestados', drawerLabel: 'Servicios prestados' }}
            />
          </>
        )}
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.surface,
  },
  scene: {
    backgroundColor: colors.background,
  },
  drawerContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  drawerHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  logo: {
    height: 56,
    marginBottom: spacing.xs,
    alignSelf: 'center',
    resizeMode: 'contain',
    width: 56,
  },
  drawerEyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawerTitle: {
    color: colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
  },
  drawerText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  roleSwitch: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  roleButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  drawerList: {
    flex: 1,
    marginTop: spacing.lg,
  },
  logoutItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  logoutLabel: {
    color: colors.danger,
    fontWeight: '700',
  },
});