import { Tabs } from 'expo-router';
import { NAV, NavBar, NavItem } from '@/components/BottomNav';
import { C } from '@/theme';

const ROUTES: Record<string, (typeof NAV)[number]> = {
  index: NAV[0]!,
  feed: NAV[1]!,
  events: NAV[2]!,
  chat: NAV[3]!,
  profile: NAV[4]!,
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      tabBar={({ state, emitter, navigateToTab }) => (
        <NavBar>
          {state.routes.map((route, index) => {
            const n = ROUTES[route.name];
            if (!n) return null;
            const focused = state.index === index;
            return (
              <NavItem
                key={route.key}
                label={n.label}
                icon={n.icon}
                active={focused}
                onPress={() => {
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigateToTab(route.key);
                }}
              />
            );
          })}
        </NavBar>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
