import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { C } from '@/theme';
import { BottomNav, type NavKey } from './BottomNav';

interface ScreenProps {
  children: ReactNode;
  /** `false` bo'lsa ScrollView ishlatilmaydi (masalan, chat yoki FlatList uchun) */
  scroll?: boolean;
  /** eski API bilan moslik uchun; e'tiborsiz */
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Tepada qotib turadigan sarlavha */
  header?: ReactNode;
  /** Pastda (nav ustida) qotib turadigan blok, masalan asosiy tugma */
  footer?: ReactNode;
  /** Pastki navigatsiya ko'rsatilsa — faol bo'lim */
  nav?: NavKey | null;
  /** Kontent atrofidagi bo'shliq */
  padded?: boolean;
  /** Kontentni ekran markaziga joylash (login) */
  center?: boolean;
  bg?: string;
  /** Tab ichidagi ekran: pastki navigatsiyani Tabs layout chizadi */
  tabbed?: boolean;
  /** Ekran ustidagi qatlam (toast, modal) */
  overlay?: ReactNode;
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  header,
  footer,
  nav = null,
  padded = true,
  center,
  bg = C.bg,
  tabbed,
  overlay,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = padded ? 16 : 0;
  const bottomSafe = nav || footer || tabbed ? 0 : insets.bottom;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        padding: pad,
        paddingTop: header ? 4 : pad,
        paddingBottom: pad + bottomSafe + 8,
        gap: 12,
        justifyContent: center ? 'center' : 'flex-start',
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: header === undefined ? insets.top : 0 }}>
      {header !== undefined ? <View style={{ paddingTop: insets.top, backgroundColor: bg }}>{header}</View> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {body}
        {footer ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: nav || tabbed ? 10 : 10 + insets.bottom,
              backgroundColor: bg,
              gap: 6,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
      {nav ? <BottomNav active={nav} /> : null}
      {overlay}
    </View>
  );
}
