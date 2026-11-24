import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, radius } from '@/theme';
import { Text } from './Text';

interface CardProps {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}

export const cardStyle: ViewStyle = {
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.lineSoft,
  borderRadius: radius.lg,
  shadowColor: '#3A2F1A',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

export function Card({ title, children, style, onPress, padded = true }: CardProps) {
  const body = (
    <>
      {title ? <Text variant="h3">{title}</Text> : null}
      {children}
    </>
  );
  const base: ViewStyle = { ...cardStyle, padding: padded ? 14 : 0, gap: 10 };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{body}</View>;
}
