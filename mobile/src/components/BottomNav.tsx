import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type NavKey = 'home' | 'feed' | 'events' | 'chat' | 'profile';

export const NAV: Array<{ key: NavKey; label: string; icon: IconName; href: string }> = [
  { key: 'home', label: 'Bosh sahifa', icon: 'House', href: '/' },
  { key: 'feed', label: 'Muammolar', icon: 'ClipboardList', href: '/feed' },
  { key: 'events', label: 'Tadbirlar', icon: 'CalendarDays', href: '/events' },
  { key: 'chat', label: 'Chat', icon: 'MessageSquare', href: '/chat' },
  { key: 'profile', label: 'Profil', icon: 'User', href: '/profile' },
];

export function NavItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', paddingTop: 6, paddingBottom: 4 }}
    >
      <View
        style={{
          alignItems: 'center',
          gap: 2,
          paddingHorizontal: 10,
          paddingVertical: 4,
          minWidth: 64,
          borderRadius: 14,
          backgroundColor: active ? C.primarySoft : 'transparent',
        }}
      >
        <Icon name={icon} size={21} color={active ? C.primary : C.ink2} strokeWidth={active ? 2.2 : 1.9} />
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            lineHeight: 14,
            fontFamily: active ? F.bold : F.medium,
            color: active ? C.primary : C.ink2,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function NavBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderTopWidth: 1,
        borderTopColor: C.lineSoft,
        paddingBottom: Math.max(insets.bottom, 6),
        paddingHorizontal: 4,
      }}
    >
      {children}
    </View>
  );
}

/** Tab'lardan tashqaridagi ekranlarda ham (tafsilot sahifalari) bir xil pastki navigatsiya. */
export function BottomNav({ active }: { active: NavKey }) {
  const router = useRouter();
  return (
    <NavBar>
      {NAV.map((n) => (
        <NavItem
          key={n.key}
          label={n.label}
          icon={n.icon}
          active={n.key === active}
          onPress={() => router.navigate(n.href as never)}
        />
      ))}
    </NavBar>
  );
}
