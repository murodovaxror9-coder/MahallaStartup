import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { BellButton, DateBlock, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { dayNumber, formatTime, formatYmd, monthShort, monthTitle, prevMonthTitle, timeLeft } from '@/lib/format';
import { useApi, useMe } from '@/lib/hooks';
import type { EventItem, HomeData, IssueDetail } from '@/lib/types';
import { C, F } from '@/theme';

const VOTES_PER_MONTH = 3;

// API: GET /home -> { round: { periodEnd, votesLeft }, featuredIssue, nextEvent,
//                     latestImportantAnnouncement, unreadNotifications }  (bitta so'rov)
//      + featuredIssue/nextEvent tafsiloti (mas'ul, muddat, qatnashchilar soni)
export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useApi<HomeData>('/home');
  const { data: me, reload: reloadMe } = useMe();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);

  const featuredId = data?.featuredIssue?.id;
  const eventId = data?.nextEvent?.id;

  useEffect(() => {
    if (!featuredId) return;
    let alive = true;
    api<IssueDetail>(`/issues/${featuredId}`)
      .then((d) => alive && setIssue(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [featuredId]);

  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    api<EventItem>(`/events/${eventId}`)
      .then((d) => alive && setEvent(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [eventId]);

  // Boshqa ekrandan qaytilganda (ovoz berildi, bildirishnoma o'qildi) yangilanadi
  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadMe();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const firstName = me?.user.displayName.split(/\s+/)[0] ?? '';
  const votesLeft = data?.round.votesLeft ?? 0;
  const periodEnd = data?.round.periodEnd;

  return (
    <Screen
      tabbed
      refreshing={false}
      onRefresh={() => {
        void reload();
        void reloadMe();
      }}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text variant="small" style={{ color: C.ink2 }}>
              Assalomu alaykum{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text variant="h1" numberOfLines={1}>
              {me?.mahalla.name ?? 'Mahalladosh'}
            </Text>
          </View>
          <BellButton count={data?.unreadNotifications ?? me?.unreadNotifications ?? 0} />
        </View>
      }
      footer={<Button title="Muammo yuborish" icon="Plus" onPress={() => router.push('/issues/new')} />}
    >
      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data && loading ? (
        <Skeleton count={4} height={110} />
      ) : data ? (
        <>
          {/* Ovoz davri */}
          <View style={{ backgroundColor: C.primary, borderRadius: 16, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: C.onPrimary, fontFamily: F.semibold, fontSize: 16 }}>
                {periodEnd ? `${monthTitle(periodEnd)} ovozi` : 'Oylik ovoz'}
              </Text>
              <Text style={{ color: C.onPrimary, opacity: 0.85, fontFamily: F.semibold, fontSize: 12 }}>tugashiga</Text>
            </View>
            <Text style={{ color: C.onPrimary, fontFamily: F.bold, fontSize: 26, lineHeight: 32 }}>
              {periodEnd ? timeLeft(periodEnd) : '—'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {Array.from({ length: VOTES_PER_MONTH }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 18,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: i < VOTES_PER_MONTH - votesLeft ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
                  }}
                />
              ))}
              <Text style={{ color: C.onPrimary, fontFamily: F.semibold, fontSize: 13, marginLeft: 4 }}>
                Sizda {VOTES_PER_MONTH} tadan {votesLeft} ta ovoz qoldi
              </Text>
            </View>
            <Button
              title="Ovoz berish"
              variant="light"
              size="md"
              onPress={() => router.navigate({ pathname: '/feed', params: { period: 'current' } })}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* G'olib / jarayondagi muammo */}
          {data.featuredIssue ? (
            <Card onPress={() => router.push(`/issues/${data.featuredIssue?.id}`)} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text variant="small" style={{ color: C.ink2 }}>
                  {periodEnd ? `${prevMonthTitle(periodEnd)} g‘olibi` : 'Oy muammosi'}
                </Text>
                <StatusBadge status={data.featuredIssue.status} statusLabel={data.featuredIssue.statusLabel} />
              </View>
              <Text variant="h3" style={{ fontSize: 16 }}>
                {data.featuredIssue.title}
              </Text>
              {issue && (issue.responsible || issue.dueDate) ? (
                <Text variant="small" style={{ color: C.ink2 }}>
                  {[
                    issue.responsible ? `Mas’ul: ${issue.responsible}` : null,
                    issue.dueDate ? `Muddat: ${formatYmd(issue.dueDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {/* Navbatdagi tadbir */}
          {data.nextEvent ? (
            <Card
              onPress={() => router.push(`/events/${data.nextEvent?.id}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <DateBlock day={dayNumber(data.nextEvent.startsAt)} month={monthShort(data.nextEvent.startsAt)} size={48} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="small">Navbatdagi tadbir</Text>
                <Text variant="h3" numberOfLines={1}>
                  {data.nextEvent.title}
                </Text>
                <Text variant="small" style={{ color: C.ink2 }} numberOfLines={1}>
                  {formatTime(data.nextEvent.startsAt)} · {data.nextEvent.location}
                  {event ? ` · ${event.rsvpCount} kishi` : ''}
                </Text>
              </View>
            </Card>
          ) : null}

          {/* Muhim e'lon */}
          {data.latestImportantAnnouncement ? (
            <Pressable
              onPress={() => router.push(`/announcements/${data.latestImportantAnnouncement?.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: 10,
                backgroundColor: C.dangerBg,
                borderRadius: 14,
                padding: 14,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ paddingTop: 1 }}>
                <Icon name="Megaphone" size={18} color={C.danger} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.danger, fontFamily: F.semibold, fontSize: 12 }}>Muhim e’lon</Text>
                <Text variant="bodyStrong" style={{ fontSize: 15, lineHeight: 20 }}>
                  {data.latestImportantAnnouncement.title}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
