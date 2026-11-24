import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, CATEGORY, F, radius } from '@/theme';
import { cardStyle } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Sarlavha: chapda orqaga (ixtiyoriy) va nom, o'ngda amal. */
export function Header({
  title,
  back,
  backLabel,
  right,
  subtitle,
  small,
}: {
  title?: string;
  back?: boolean;
  backLabel?: string;
  right?: ReactNode;
  subtitle?: string;
  small?: boolean;
}) {
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        paddingHorizontal: back ? 8 : 16,
        paddingVertical: 6,
        gap: 4,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          hitSlop={8}
          style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="ChevronLeft" size={24} color={C.ink} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: 1 }}>
        {backLabel ? (
          <Text style={{ fontSize: 14, color: C.ink2 }}>{backLabel}</Text>
        ) : title ? (
          <Text variant={small ? 'h2' : 'h1'} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function BellButton({ count }: { count: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Bildirishnomalar, ${count} ta yangi` : 'Bildirishnomalar'}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: pressed ? C.surface2 : C.surface,
        borderWidth: 1,
        borderColor: C.line,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Icon name="Bell" size={20} color={C.ink} />
      {count > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            paddingHorizontal: 4,
            backgroundColor: C.danger,
            borderWidth: 2,
            borderColor: C.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12, fontFamily: F.bold }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type NoticeTone = 'info' | 'ok' | 'warn' | 'error';
const NOTICE: Record<NoticeTone, { bg: string; fg: string; border: string; icon: IconName }> = {
  info: { bg: '#E1EBF7', fg: C.focus, border: '#C7D8EE', icon: 'CircleDot' },
  ok: { bg: C.primarySoft, fg: C.primary, border: '#B9D9CC', icon: 'CircleCheck' },
  warn: { bg: C.warnBg, fg: C.warnFg, border: C.warnBorder, icon: 'TriangleAlert' },
  error: { bg: C.dangerBg, fg: C.danger, border: '#F2C9C3', icon: 'TriangleAlert' },
};

export function Notice({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  icon?: IconName;
}) {
  const n = NOTICE[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        backgroundColor: n.bg,
        borderWidth: 1,
        borderColor: n.border,
        borderRadius: radius.md,
        padding: 12,
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon ?? n.icon} size={17} color={n.fg} />
      </View>
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: tone === 'warn' ? C.ink2 : n.fg }}>
        {title ? <Text style={{ fontSize: 13, lineHeight: 19, fontFamily: F.bold, color: n.fg }}>{title} </Text> : null}
        {children}
      </Text>
    </View>
  );
}

/** Ro'yxat yuklanayotganda kulrang kartalar. */
export function Skeleton({ count = 3, height = 92 }: { count?: number; height?: number }) {
  const [o] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={{ opacity: o, height, borderRadius: radius.lg, backgroundColor: C.surface2 }}
        />
      ))}
    </View>
  );
}

/** Ikki variantli tanlagich (Kelayotgan / O‘tgan). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? C.surface : 'transparent',
              ...(active ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 } : null),
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: active ? F.semibold : F.medium, color: active ? C.ink : C.ink2 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sana bloki: 28 / noy. */
export function DateBlock({
  day,
  month,
  muted,
  struck,
  size = 52,
}: {
  day: string;
  month: string;
  muted?: boolean;
  struck?: boolean;
  size?: number;
}) {
  const fg = muted ? C.muted : C.warnFg;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: muted ? C.surface2 : C.warnBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size > 46 ? 20 : 17,
          lineHeight: size > 46 ? 24 : 20,
          fontFamily: F.bold,
          color: fg,
          textDecorationLine: struck ? 'line-through' : 'none',
        }}
      >
        {day}
      </Text>
      <Text style={{ fontSize: 11, lineHeight: 13, fontFamily: F.medium, color: fg }}>{month}</Text>
    </View>
  );
}

/** 64×64 thumbnail yoki toifa ikonkasi. */
export function CategoryThumb({ category, size = 64 }: { category: string; size?: number }) {
  const c = CATEGORY[category as keyof typeof CATEGORY] ?? CATEGORY.OTHER;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: C.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={c.icon} size={size * 0.36} color={C.ink2} strokeWidth={1.8} />
    </View>
  );
}

/** Pastdan chiqadigan tanlov ro'yxati. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ value: T | null; label: string; destructive?: boolean; icon?: IconName }>;
  value?: T | null;
  onSelect: (v: T | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,24,22,0.38)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line }} />
        <Text variant="h2" style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          {title}
        </Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {options.map((o) => {
            const selected = value !== undefined && o.value === value;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  paddingHorizontal: 20,
                  backgroundColor: pressed ? C.surface2 : 'transparent',
                })}
              >
                {o.icon ? <Icon name={o.icon} size={19} color={o.destructive ? C.danger : C.ink2} /> : null}
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: o.destructive ? C.danger : C.ink,
                    fontFamily: selected ? F.semibold : F.regular,
                  }}
                >
                  {o.label}
                </Text>
                {selected ? <Icon name="Check" size={19} color={C.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Ekran pastida 3 soniyalik xabar. */
export function Toast({ message, tone = 'ok', onHide }: { message: string | null; tone?: 'ok' | 'error'; onHide: () => void }) {
  const insets = useSafeAreaInsets();
  const hideRef = useRef(onHide);
  useEffect(() => {
    hideRef.current = onHide;
  });
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => hideRef.current(), 3000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 90,
        backgroundColor: tone === 'error' ? C.danger : C.ink,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Icon name={tone === 'error' ? 'TriangleAlert' : 'CircleCheck'} size={18} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 14, flex: 1 }}>{message}</Text>
    </View>
  );
}

export function Section({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[cardStyle, { overflow: 'hidden' }, style]}>{children}</View>;
}

/** Lucide ikonkali kichik dumaloq tugma (rasm ustida). */
export function RoundIconButton({
  icon,
  onPress,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: pressed ? C.surface2 : C.surface,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      })}
    >
      <Icon name={icon} size={20} color={C.ink} />
    </Pressable>
  );
}
