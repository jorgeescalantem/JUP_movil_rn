import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectivityGate } from './src/components/ConnectivityGate';
import { AppDrawer } from './src/navigation/AppDrawer';
import { LoginScreen } from './src/screens/LoginScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { PreoperationalSurveyScreen } from './src/screens/PreoperationalSurveyScreen';
import { RecoverPasswordScreen } from './src/screens/RecoverPasswordScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { SelectVehicleScreen } from './src/screens/SelectVehicleScreen';
import { hasCompletedPermissionsOnboarding } from './src/services/permissionsFlow';
import { SessionProvider } from './src/store/session';
import { useSession } from './src/store/session';
import { ThemeProvider, useTheme } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <ConnectivityGate>
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
          </ConnectivityGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// StatusBar que respeta el tema actual
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootNavigator() {
  const { isAuthenticated, needsPreoperational, needsVehicleSelection } = useSession();
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'recover'>('login');
  const [needsPermissions, setNeedsPermissions] = useState<boolean | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    hasCompletedPermissionsOnboarding().then((done) => setNeedsPermissions(!done));
  }, []);

  // Requisito de Google Play / App Store: solicitar los permisos antes de
  // registrarse/iniciar sesion. Se muestra una sola vez por dispositivo.
  if (needsPermissions === null) {
    return null;
  }

  if (needsPermissions) {
    return <PermissionsScreen onDone={() => setNeedsPermissions(false)} />;
  }

  if (!isAuthenticated) {
    if (authScreen === 'register') {
      return <RegisterScreen onBack={() => setAuthScreen('login')} />;
    }

    if (authScreen === 'recover') {
      return <RecoverPasswordScreen onBack={() => setAuthScreen('login')} />;
    }

    return (
      <LoginScreen
        onOpenRecover={() => setAuthScreen('recover')}
        onOpenRegister={() => setAuthScreen('register')}
      />
    );
  }

  if (needsPreoperational) {
    return <PreoperationalSurveyScreen />;
  }

  if (needsVehicleSelection) {
    return <SelectVehicleScreen />;
  }

  // Envuelve el Drawer para asegurar que el fondo respeta el tema
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <AppDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});