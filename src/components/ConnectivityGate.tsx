import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ConnectionErrorScreen } from '../screens/ConnectionErrorScreen';
import { checkApiConnection } from '../services/authApi';
import { setSystemToken } from '../services/apiSessionStore';
import { colors, spacing } from '../theme';

type ConnectivityStatus = 'checking' | 'error' | 'connected';

/**
 * Gates the whole app behind a connectivity check against the real API.
 * While checking, shows a loader. If the check fails, shows a dedicated
 * error screen with a retry action. Only once the API responds successfully
 * does it render the actual application (login screen and beyond).
 *
 * The token returned by this system-level check is cached in-memory
 * (see apiSessionStore) so later authenticated calls, like the real user
 * login against the OData API, can reuse it.
 */
export function ConnectivityGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const runCheck = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(undefined);

    const result = await checkApiConnection();

    if (result.ok) {
      setSystemToken(result.data.token);
      setStatus('connected');
    } else {
      setSystemToken(null);
      setErrorMessage(result.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (status === 'checking') {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loaderText}>Conectando con el servidor...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return <ConnectionErrorScreen message={errorMessage} onRetry={runCheck} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
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
