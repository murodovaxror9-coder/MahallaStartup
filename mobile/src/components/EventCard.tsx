import { View } from 'react-native';
import { dayNumber, formatTime, isPast, monthLong, weekday } from '@/lib/format';
import type { EventItem } from '@/lib/types';
import { C, F } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { DateBlock } from './ui';

export function EventCard({
  event,
  onPress,
  onToggle,
  pending,
}: {
  event: EventItem;
  onPress: () => void;
  onToggle?: () => void;
  pending?: boolean;
}) {
  const cancelled = event.status === 'CANCELLED';
  const completed = event.status === 'COMPLETED' || isPast(event.startsAt);
  const canRsvp = event.status === 'PUBLISHED' && !completed;

  return (
    <Card onPress={onPress} style={{ gap: 12, opacity: cancelled ? 0.92 : 1 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateBlock
          day={dayNumber(event.startsAt)}
          month={monthLong(event.startsAt)}
          muted={cancelled || completed}
          struck={cancelled}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="h3" style={{ color: cancelled ? C.ink2 : C.ink }} numberOfLines={2}>
            {event.title}
          </Text>
          {!cancelled ? (
            <Text variant="small" style={{ color: C.ink2 }} numberOfLines={1}>
              {weekday(event.startsAt)}, {formatTime(event.startsAt)} · {event.location}
            </Text>
          ) : (
            <Text variant="small" numberOfLines={1}>
              {event.location}
            </Text>
          )}
          {!cancelled ? (
            <Text variant="small" style={{ color: C.ink2 }}>
              {event.rsvpCount} kishi {completed ? 'qatnashdi' : 'qatnashadi'}
            </Text>
          ) : null}
        </View>
      </View>

      {cancelled ? (
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.dangerBg, borderRadius: 10, padding: 10 }}>
          <Icon name="Ban" size={16} color={C.danger} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: C.danger }}>
            <Text style={{ fontSize: 13, fontFamily: F.bold, color: C.danger }}>Bekor qilindi. </Text>
            {event.resultText ?? 'Yangi sana keyin e’lon qilinadi.'}
          </Text>
        </View>
      ) : canRsvp && onToggle ? (
        <Button
          title="Qatnashaman"
          icon={event.myRsvp ? 'Check' : undefined}
          variant={event.myRsvp ? 'soft' : 'primary'}
          size="md"
          loading={pending}
          onPress={onToggle}
        />
      ) : completed && event.resultText ? (
        <Text variant="small" style={{ color: C.ink2 }} numberOfLines={2}>
          Natija: {event.resultText}
        </Text>
      ) : null}
    </Card>
  );
}
