import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { EventItem } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET /events/:id   PUT|DELETE /events/:id/rsvp (idempotent; faqat PUBLISHED va kelajakdagi tadbir)
export default function EventDetailScreen() {
  const { colors, spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, loading, error, reload } = useApi<EventItem>(`/events/${id}`);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleRsvp() {
    if (!event) return;
    setPending(true);
    setActionError(null);
    try {
      if (event.myRsvp) await api(`/events/${id}/rsvp`, { method: 'DELETE' });
      else await api(`/events/${id}/rsvp`, { method: 'PUT' });
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setPending(false);
    }
  }

  if (loading && !event) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !event) {
    return (
      <Screen>
        <Text style={{ color: colors.danger }}>{error ?? 'Topilmadi'}</Text>
        <Button title="Qayta urinish" variant="secondary" onPress={reload} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Text variant="title">{event.title}</Text>
      {event.status === 'CANCELLED' ? <Pill label="Bekor qilingan" tone="danger" /> : null}
      {event.status === 'COMPLETED' ? <Pill label="Yakunlangan" tone="success" /> : null}

      <Card title="Ma'lumot">
        <Text variant="muted">Vaqt: {formatDateTime(event.startsAt)}</Text>
        {event.endsAt ? <Text variant="muted">Tugashi: {formatDateTime(event.endsAt)}</Text> : null}
        <Text variant="muted">Joy: {event.location}</Text>
        <Text variant="muted">Tashkilotchi: {event.organizer}</Text>
        <Text variant="muted">{event.rsvpCount} kishi qatnashadi</Text>
      </Card>

      <Card title="Tavsif">
        <Text>{event.description}</Text>
      </Card>

      {event.resultText ? (
        <Card title="Natija">
          <Text>{event.resultText}</Text>
        </Card>
      ) : null}

      {event.media && event.media.length > 0 ? (
        <Card title="Foto">
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {event.media.map((m) => (
              <Image
                key={m.id}
                source={{ uri: m.thumbUrl ?? m.url }}
                style={{ width: 96, height: 96, borderRadius: 8 }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {actionError ? <Text style={{ color: colors.danger }}>{actionError}</Text> : null}

      <Button
        title={event.myRsvp ? 'Yozilishni bekor qilish' : 'Qatnashaman'}
        variant={event.myRsvp ? 'secondary' : 'primary'}
        onPress={toggleRsvp}
        loading={pending}
        disabled={!event.myRsvp && event.status !== 'PUBLISHED'}
      />
    </Screen>
  );
}
