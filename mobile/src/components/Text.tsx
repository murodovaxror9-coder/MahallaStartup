import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '@/theme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'label';

const sizes: Record<Variant, { fontSize: number; fontWeight?: '600' | '700'; lineHeight: number }> = {
  title: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  heading: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  muted: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
};

export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const { colors } = useTheme();
  return (
    <RNText
      {...props}
      style={[sizes[variant], { color: variant === 'muted' ? colors.muted : colors.text }, style]}
    />
  );
}
