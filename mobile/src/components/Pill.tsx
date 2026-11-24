import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, radius } = useTheme();
  const color = tone === 'neutral' ? colors.muted : colors[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text variant="label" style={{ color, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}
