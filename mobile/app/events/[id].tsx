import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header, Notice, Skeleton, Toast } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { formatDate, formatTime, isPast, weekday } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { EventItem } from '@/lib/types';
import { C } from '@/theme';

function InfoRow({ icon, label, value, last }: { icon: IconName; label: string; value: string; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.lineSoft,
      }}
    >
      <Icon name={icon} size={20} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="small" style={{ fontSize: 12, lineHeight: 15 }}>
          {label}
        </Text>
        <Text variant="bodyStrong" style={{ fontSize: 15, lineHeight: 20 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// API: GET /events/:id   PUT|DELETE /events/:id/rsvp (idempotent; faqat PUBLISHED va kelajakdagi tadbir)
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<EventItem>(`/events/${id}`);
  const [override, setOverride] = useState<Pick<EventItem, 'myRsvp' | 'rsvpCount'> | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const event = data ? { ...data, ...(override ?? {}) } : null;

  async function toggle() {
    if (!event) return;
    const prev = { myRsvp: event.myRsvp, rsvpCount: event.rsvpCount };
    setOverride({ myRsvp: !prev.myRsvp, rsvpCount: Math.max(0, prev.rsvpCount + (prev.myRsvp ? -1 : 1)) });
    setPending(true);
    try {
      await api(`/events/${id}/rsvp`, { method: prev.myRsvp ? 'DELETE' : 'PUT' });
    } catch (e) {
      setOverride(prev);
      setToast(errorText(e));
    } finally {
      setPending(false);
    }
  }

  const cancelled = event?.status === 'CANCELLED';
  const past = event ? event.status === 'COMPLETED' || isPast(event.startsAt) : false;
  const canRsvp = event?.status === 'PUBLISHED' && !past;

  return (
    <Screen
      nav="events"
      header={<Header back backLabel="Tadbirlar" />}
      overlay={<Toast message={toast} tone="error" onHide={() => setToast(null)} />}
      refreshing={false}
      onRefresh={() => {
        setOverride(null);
        void reload();
      }}
      footer={
        event && canRsvp ? (
          <>
            <Button
              title={event.myRsvp ? 'Qatnashaman · Bekor qilish' : 'Qatnashaman'}
              icon={event.myRsvp ? 'Check' : undefined}
              variant={event.myRsvp ? 'soft' : 'primary'}
              loading={pending}
              onPress={toggle}
            />
            <Text variant="small" style={{ textAlign: 'center', fontSize: 12 }}>
              Boshlanishidan 24 soat oldin eslatma keladi
            </Text>
          </>
        ) : undefined
      }
    >
      {error && !event ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !event ? (
        loading ? <Skeleton count={2} height={140} /> : null
      ) : (
        <>
          <View style={{ gap: 8 }}>
            {cancelled ? (
              <Pill label="Bekor qilingan" tone="danger" icon="Ban" />
            ) : past ? (
              <Pill label="Yakunlangan" tone="success" icon="CircleCheck" />
            ) : (
              <Pill label={weekday(event.startsAt)} />
            )}
            <Text variant="h1">{event.title}</Text>
          </View>

          {cancelled ? (
            <Notice tone="error" title="Bekor qilindi." icon="Ban">
              {event.resultText ?? 'Yangi sana keyin e’lon qilinadi.'}
            </Notice>
          ) : null}

          <Card style={{ paddingVertical: 4, gap: 0 }}>
            <InfoRow
              icon="CalendarDays"
              label="Sana va vaqt"
              value={`${formatDate(event.startsAt)}, ${weekday(event.startsAt).toLowerCase()} · ${formatTime(event.startsAt)}`}
            />
            <InfoRow icon="MapPin" label="Joy" value={event.location} />
            <InfoRow icon="User" label="Tashkilotchi" value={event.organizer} />
            <InfoRow icon="Users" label="Qatnashchilar" value={`${event.rsvpCount} kishi`} last />
          </Card>

          {event.description ? <Text style={{ fontSize: 15, lineHeight: 23, color: C.ink }}>{event.description}</Text> : null}

          {past && !cancelled && event.resultText ? (
            <Card title="Natija">
              <Text>{event.resultText}</Text>
            </Card>
          ) : null}

          {event.media && event.media.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {event.media.map((m) => (
                <Image
                  key={m.id}
                  source={{ uri: m.thumbUrl ?? m.url }}
                  style={{ width: 140, height: 110, borderRadius: 12, backgroundColor: C.surface2 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          ) : null}
        </>
      )}
    </Screen>
  );
}
