import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface CardProps {
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ title, children, style }: CardProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {title ? <Text variant="heading">{title}</Text> : null}
      {children}
    </View>
  );
}
