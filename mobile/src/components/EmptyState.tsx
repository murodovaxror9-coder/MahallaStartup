import { View } from 'react-native';
import { C } from '@/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  hint?: string;
  actionTitle?: string;
  onAction?: () => void;
  icon?: IconName;
}

export function EmptyState({ title, hint, actionTitle, onAction, icon = 'Inbox' }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: C.surface2,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size={26} color={C.muted} />
      </View>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {hint ? (
        <Text variant="small" style={{ textAlign: 'center' }}>
          {hint}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="secondary" size="md" style={{ marginTop: 8 }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: C.dangerBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Icon name="TriangleAlert" size={26} color={C.danger} />
      </View>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        Ma’lumotni yuklab bo‘lmadi
      </Text>
      {message ? (
        <Text variant="small" style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Button title="Qayta urinish" icon="RotateCw" onPress={onRetry} variant="secondary" size="md" style={{ marginTop: 8 }} />
      ) : null}
    </View>
  );
}
