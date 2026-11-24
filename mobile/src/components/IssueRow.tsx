import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { IssueListItem } from '@/lib/types';
import { C, CATEGORY, F, radius } from '@/theme';
import { cardStyle } from './Card';
import { Icon } from './Icon';
import { StatusBadge } from './Pill';
import { Text } from './Text';
import { CategoryThumb } from './ui';

/** Lenta kartasi (IssueCard): 64×64 thumbnail · sarlavha · toifa va joy · badge · ovoz soni. */
export function IssueRow({
  item,
  onPress,
  rightNote,
}: {
  item: IssueListItem;
  onPress: () => void;
  rightNote?: string;
}) {
  const cat = CATEGORY[item.category as keyof typeof CATEGORY];
  const voting = item.voteCount !== null && (item.status === 'OPEN' || item.status === 'SELECTED');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        cardStyle,
        { flexDirection: 'row', gap: 12, padding: 12, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {item.thumbUrl ? (
        <Image
          source={{ uri: item.thumbUrl }}
          style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: C.surface2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <CategoryThumb category={item.category} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="h3" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
          {item.title}
        </Text>
        <Text variant="small" numberOfLines={1}>
          {(cat?.label ?? item.categoryLabel) + (item.locationText ? ` · ${item.locationText}` : '')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
          <StatusBadge status={item.status} statusLabel={item.statusLabel} />
          {rightNote ? (
            <Text variant="small">{rightNote}</Text>
          ) : voting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {item.myVote ? <Icon name="Check" size={14} color={C.primary} strokeWidth={2.6} /> : null}
              <Text style={{ fontSize: 13, fontFamily: F.semibold, color: item.myVote ? C.primary : C.ink }}>
                {item.voteCount} ovoz
              </Text>
            </View>
          ) : null}
        </View>
        {item.rejectedReason ? (
          <Text variant="small" style={{ color: C.danger }} numberOfLines={2}>
            Sabab: {item.rejectedReason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
