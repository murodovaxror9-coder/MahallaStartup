import { View } from 'react-native';
import { formatDateTime } from '@/lib/format';
import type { AnnouncementItem } from '@/lib/types';
import { C } from '@/theme';
import { Card } from './Card';
import { Pill } from './Pill';
import { Text } from './Text';

export function AnnouncementCard({
  item,
  onPress,
  preview,
}: {
  item: AnnouncementItem;
  onPress?: () => void;
  preview?: boolean;
}) {
  return (
    <Card onPress={onPress} style={{ gap: 8, borderColor: item.isImportant ? '#F2C9C3' : C.lineSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {item.isImportant ? <Pill label="Muhim" icon="Bell" tone="danger" /> : <Pill label="E’lon" />}
        <Text variant="small" style={{ fontSize: 12 }}>
          {item.publishedAt ? formatDateTime(item.publishedAt) : 'Qoralama'}
        </Text>
      </View>
      <Text variant="h3" style={{ fontSize: 16 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 21, color: C.ink2 }} numberOfLines={preview ? 4 : undefined}>
        {item.body}
      </Text>
    </Card>
  );
}
