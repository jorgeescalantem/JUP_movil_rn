import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDrawer } from './src/navigation/AppDrawer';
import { SessionProvider } from './src/store/session';
import { colors } from './src/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <SessionProvider>
        <AppDrawer />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
