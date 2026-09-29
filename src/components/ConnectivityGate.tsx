import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { env } from '../config/env';
import { ConnectionErrorScreen } from '../screens/ConnectionErrorScreen';
import { spacing, useTheme, type ThemeColors } from '../theme';

type ConnectivityStatus = 'checking' | 'error' | 'connected';

const HEALTH_CHECK_TIMEOUT_MS = 10000;

/**
 * Gates the whole app behind a connectivity check against jup-api's own
 * `/health` endpoint. While checking, shows a loader. If unreachable, shows
 * a dedicated error screen with a retry action. Only once jup-api responds
 * does it render the actual application (login screen and beyond).
 */
export function ConnectivityGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const runCheck = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(undefined);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.jupApiUrl}/health`, { signal: controller.signal });

      if (!response.ok) {
        setErrorMessage(`No se pudo establecer conexion con el servidor (codigo ${response.status}).`);
        setStatus('error');
        return;
      }

      setStatus('connected');
    } catch {
      setErrorMessage('No fue posible establecer conexion. Verifica tu internet e intenta nuevamente.');
      setStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (status === 'checking') {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.loaderText}>Conectando con el servidor...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return <ConnectionErrorScreen message={errorMessage} onRetry={runCheck} />;
  }

  return <>{children}</>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loader: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.sm,
      justifyContent: 'center',
    },
    loaderText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
