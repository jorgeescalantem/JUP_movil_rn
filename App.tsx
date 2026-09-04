import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ConnectivityGate } from './src/components/ConnectivityGate';
import { AppDrawer } from './src/navigation/AppDrawer';
import { LoginScreen } from './src/screens/LoginScreen';
import { PreoperationalSurveyScreen } from './src/screens/PreoperationalSurveyScreen';
import { RecoverPasswordScreen } from './src/screens/RecoverPasswordScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { SelectVehicleScreen } from './src/screens/SelectVehicleScreen';
import { SessionProvider } from './src/store/session';
import { useSession } from './src/store/session';
import { colors } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <ConnectivityGate>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </ConnectivityGate>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isAuthenticated, needsPreoperational, needsVehicleSelection } = useSession();
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'recover'>('login');

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

  return <AppDrawer />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
