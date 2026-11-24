import { Pressable, ScrollView } from 'react-native';
import { C, F } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface ChipsProps {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (v: string | null) => void;
  allowAll?: boolean;
}

export function Chip({
  label,
  selected,
  onPress,
  dropdown,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  dropdown?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 36,
        paddingHorizontal: 13,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? C.primary : C.line,
        backgroundColor: selected ? C.primarySoft : pressed ? C.surface2 : C.surface,
      })}
    >
      {selected && !dropdown ? <Icon name="Check" size={14} color={C.primary} strokeWidth={2.5} /> : null}
      <Text style={{ fontSize: 13, fontFamily: F.semibold, color: selected ? C.primary : C.ink }}>{label}</Text>
      {dropdown ? <Icon name="ChevronDown" size={14} color={selected ? C.primary : C.ink} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

export function Chips({ options, value, onChange, allowAll = true }: ChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {allowAll ? <Chip label="Hammasi" selected={value === null} onPress={() => onChange(null)} /> : null}
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}
