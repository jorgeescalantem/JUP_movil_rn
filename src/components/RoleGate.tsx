import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Role } from '../types/domain';
import { useSession } from '../store/session';

type RoleGateProps = {
  allowedRoles: Role[];
  title?: string;
  description?: string;
  children: ReactNode;
};

export function RoleGate({
  allowedRoles,
  title = 'Acceso restringido',
  description = 'Esta vista no esta disponible para el rol actual.',
  children,
}: RoleGateProps) {
  const { role } = useSession();

  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  title: {
    color: colors.textStrong,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});