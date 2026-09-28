import { ReactNode, useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing, useTheme, type ThemeColors } from '../theme';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPress?: () => void;
  centerTitle?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, actionLabel, onPress, centerTitle, style, children }: SectionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.headerCopy, centerTitle ? styles.headerCopyCentered : null]}>
          <Text style={[styles.title, centerTitle ? styles.titleCentered : null]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onPress ? (
          <Pressable onPress={onPress} style={styles.actionButton}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: spacing.md,
      padding: spacing.lg,
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    headerCopyCentered: {
      alignItems: 'center',
    },
    title: {
      color: colors.textStrong,
      fontSize: 18,
      fontWeight: '700',
    },
    titleCentered: {
      textAlign: 'center',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    actionButton: {
      backgroundColor: colors.blueSoft,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    actionLabel: {
      color: colors.textStrong,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}