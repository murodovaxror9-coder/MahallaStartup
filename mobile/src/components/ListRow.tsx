import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { C } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: IconName;
  right?: ReactNode;
  last?: boolean;
}

export function ListRow({ title, subtitle, onPress, destructive, icon, right, last }: ListRowProps) {
  const color = destructive ? C.danger : C.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.lineSoft,
        backgroundColor: pressed ? C.surface2 : 'transparent',
      })}
    >
      {icon ? <Icon name={icon} size={19} color={destructive ? C.danger : C.ink2} /> : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color, fontSize: 15 }}>{title}</Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}
