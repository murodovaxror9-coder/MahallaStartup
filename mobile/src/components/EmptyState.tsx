import { View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface EmptyStateProps {
  title: string;
  hint?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ title, hint, actionTitle, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 1.5 }}>
      <Text variant="heading">{title}</Text>
      {hint ? (
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {hint}
        </Text>
      ) : null}
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} /> : null}
    </View>
  );
}
