import { ActivityIndicator, Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const inactive = disabled || loading;

  const bg = variant === 'primary' ? colors.primary : colors.surface;
  const border = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.border;
  const fg = variant === 'primary' ? colors.primaryText : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text variant="label" style={{ color: fg, fontSize: 15 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
