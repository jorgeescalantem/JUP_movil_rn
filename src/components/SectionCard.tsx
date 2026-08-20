import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing } from '../theme';

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

const styles = StyleSheet.create({
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
    backgroundColor: colors.accentSoft,
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