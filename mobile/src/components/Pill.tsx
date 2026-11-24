import { View } from 'react-native';
import { C, F, STATUS, statusKey } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: C.surface2, fg: C.ink2 },
  info: { bg: '#E1EBF7', fg: C.focus },
  success: { bg: '#DFF0E1', fg: '#1F6B2E' },
  warning: { bg: C.warnBg, fg: C.warnFg },
  danger: { bg: C.dangerBg, fg: C.danger },
};

export function Pill({
  label,
  tone = 'neutral',
  icon,
  bg,
  fg,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName | string;
  bg?: string;
  fg?: string;
}) {
  const t = TONES[tone];
  const color = fg ?? t.fg;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        backgroundColor: bg ?? t.bg,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      {icon ? <Icon name={icon} size={13} color={color} strokeWidth={2.2} /> : null}
      <Text style={{ color, fontSize: 12, lineHeight: 16, fontFamily: F.semibold }}>{label}</Text>
    </View>
  );
}

/** Holat badge'i: rang + ikonka + matn (docs/design). */
export function StatusBadge({ status, statusLabel }: { status: string; statusLabel?: string }) {
  const s = STATUS[statusKey(status, statusLabel)];
  return <Pill label={statusLabel ?? s.label} icon={s.icon} bg={s.bg} fg={s.fg} />;
}
