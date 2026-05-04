import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <HomeScreen />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
});
