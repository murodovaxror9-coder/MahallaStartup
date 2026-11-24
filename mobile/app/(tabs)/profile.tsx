import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Section, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import type { CurrentRoundData, IssueListItem, Page } from '@/lib/types';
import { C, F } from '@/theme';

interface Stats {
  posts: number;
  postsMore: boolean;
  rejected: number;
  votesUsed: number;
  following: number;
}

async function loadStats(): Promise<Stats> {
  const [mine, round] = await Promise.all([
    api<Page<IssueListItem>>('/issues/mine?limit=50'),
    api<CurrentRoundData>('/rounds/current').catch(() => null),
  ]);
  // Kuzatilayotganlar: lentadagi postlar ichidan (mahalla miqyosida yetarli; 200 tagacha)
  let following = 0;
  let cursor: string | null = null;
  for (let i = 0; i < 4; i++) {
    const page: Page<IssueListItem> = await api<Page<IssueListItem>>(
      `/issues?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    following += page.items.filter((x) => x.isFollowing).length;
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return {
    posts: mine.items.length,
    postsMore: mine.nextCursor !== null,
    rejected: mine.items.filter((x) => x.status === 'REJECTED').length,
    votesUsed: round?.votesUsed ?? 0,
    following,
  };
}

// API: GET /me, GET /issues/mine, GET /rounds/current, GET /issues (kuzatilayotganlar), POST /auth/logout
export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useSession();
  const { data: me, loading, error, reload } = useMe();
  const [stats, setStats] = useState<Stats | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStats()
        .then(setStats)
        .catch(() => undefined);
    }, []),
  );

  function confirmSignOut() {
    Alert.alert('Chiqish', 'Akkauntdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: () => {
          setSigningOut(true);
          void signOut();
        },
      },
    ]);
  }

  return (
    <Screen
      tabbed
      refreshing={false}
      onRefresh={() => {
        void reload();
        loadStats().then(setStats).catch(() => undefined);
      }}
      header={
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
          <Text variant="h1">Profil</Text>
        </View>
      }
    >
      {error && !me ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !me ? (
        loading ? <Skeleton count={2} height={90} /> : null
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: C.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 19, fontFamily: F.bold, color: C.primary }}>{initials(me.user.displayName)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h3" style={{ fontSize: 17 }}>
                {me.user.displayName}
              </Text>
              <Text variant="small" style={{ color: C.ink2 }} numberOfLines={1}>
                {me.mahalla.name} · login: {me.user.login}
              </Text>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Stat value={stats ? `${stats.posts}${stats.postsMore ? '+' : ''}` : '—'} label="postim" />
            <Stat value={stats ? `${stats.votesUsed}/3` : '—'} label="ovoz berildi" />
            <Stat value={stats ? String(stats.following) : '—'} label="kuzatyapman" />
          </View>

          <Section>
            <ListRow
              icon="ClipboardList"
              title="Mening postlarim"
              onPress={() => router.push('/issues/mine')}
              right={stats && stats.rejected > 0 ? <Pill label={`${stats.rejected} tuzatish kerak`} tone="danger" /> : <Chevron />}
            />
            <ListRow icon="Megaphone" title="E’lonlar" onPress={() => router.push('/announcements')} right={<Chevron />} />
            <ListRow icon="Trophy" title="Ovoz natijalari" onPress={() => router.push('/rounds')} right={<Chevron />} />
            <ListRow icon="KeyRound" title="Parolni almashtirish" onPress={() => router.push('/change-password')} right={<Chevron />} />
            <ListRow
              icon="Bell"
              title="Bildirishnomalar"
              subtitle="Ilova ichidagi xabarlar"
              onPress={() => router.push('/notifications')}
              right={
                me.unreadNotifications > 0 ? (
                  <Pill label={`${me.unreadNotifications} ta yangi`} tone="success" />
                ) : (
                  <Chevron />
                )
              }
              last
            />
          </Section>

          <Button title="Chiqish" icon="LogOut" variant="danger" loading={signingOut} onPress={confirmSignOut} />
        </>
      )}
    </Screen>
  );
}

function Chevron() {
  return <Icon name="ChevronRight" size={18} color={C.muted} />;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 0, paddingVertical: 12 }}>
      <Text style={{ fontSize: 20, lineHeight: 24, fontFamily: F.bold }}>{value}</Text>
      <Text variant="small" style={{ fontSize: 12, color: C.ink2 }}>
        {label}
      </Text>
    </Card>
  );
}
