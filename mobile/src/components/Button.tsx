import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, F, radius } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft' | 'light';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  right?: ReactNode;
}

const V: Record<ButtonVariant, { bg: string; bgPressed: string; fg: string; border: string }> = {
  primary: { bg: C.primary, bgPressed: C.primaryPressed, fg: C.onPrimary, border: C.primary },
  secondary: { bg: C.surface, bgPressed: C.surface2, fg: C.ink, border: C.line },
  danger: { bg: C.surface, bgPressed: C.dangerBg, fg: C.danger, border: '#EBC3BD' },
  ghost: { bg: 'transparent', bgPressed: C.surface2, fg: C.primary, border: 'transparent' },
  soft: { bg: C.primarySoft, bgPressed: '#CDE4DA', fg: C.primary, border: '#9CC9B8' },
  light: { bg: C.surface, bgPressed: '#F0F0F0', fg: C.primary, border: C.surface },
};

const H = { lg: 52, md: 46, sm: 38 } as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'lg',
  style,
  right,
}: ButtonProps) {
  const v = V[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: H[size],
          borderRadius: radius.md,
          backgroundColor: pressed ? v.bgPressed : v.bg,
          borderWidth: 1,
          borderColor: v.border,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled && !loading ? 0.55 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
        <Text style={{ color: v.fg, fontFamily: F.semibold, fontSize: size === 'sm' ? 14 : 15 }}>{title}</Text>
        {right}
      </View>
    </Pressable>
  );
}
