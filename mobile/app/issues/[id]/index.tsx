import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { ListRow } from '@/components/ListRow';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useApi, useMe, usePagedList } from '@/lib/hooks';
import type { CommentItem, IssueDetail } from '@/lib/types';
import { useTheme } from '@/theme';

const EDITABLE = ['PENDING_REVIEW', 'REJECTED'];

// API: GET  /issues/:id -> media URL'lar, voteCount, myVote, isFollowing, statusLabel, tarix, duplicateOf, canVote
//      PUT|DELETE /issues/:id/vote        PUT|DELETE /issues/:id/follow
//      GET|POST   /issues/:id/comments    POST /issues/:id/feedback { type: CONFIRMED|STILL_ONGOING, comment, mediaIds[] }
//      POST /reports { targetType, targetId, reason }
export default function IssueDetailScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useMe();
  const { data: issue, loading, error, reload } = useApi<IssueDetail>(`/issues/${id}`);
  const comments = usePagedList<CommentItem>(`/issues/${id}/comments`);

  const [comment, setComment] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportPending, setReportPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleVote() {
    if (!issue) return;
    setVotePending(true);
    setActionError(null);
    try {
      if (issue.myVote) await api(`/issues/${id}/vote`, { method: 'DELETE' });
      else await api(`/issues/${id}/vote`, { method: 'PUT' });
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setVotePending(false);
    }
  }

  async function toggleFollow() {
    if (!issue) return;
    setFollowPending(true);
    setActionError(null);
    try {
      if (issue.isFollowing) await api(`/issues/${id}/follow`, { method: 'DELETE' });
      else await api(`/issues/${id}/follow`, { method: 'PUT' });
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setFollowPending(false);
    }
  }

  async function sendComment() {
    if (!comment.trim()) return;
    setCommentPending(true);
    try {
      await api(`/issues/${id}/comments`, { method: 'POST', json: { text: comment.trim() } });
      setComment('');
      await comments.reload();
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setCommentPending(false);
    }
  }

  async function sendFeedback(type: 'CONFIRMED' | 'STILL_ONGOING') {
    setFeedbackPending(true);
    setActionError(null);
    try {
      await api(`/issues/${id}/feedback`, {
        method: 'POST',
        json: { type, comment: type === 'CONFIRMED' ? 'Tasdiqlayman' : 'Hali davom etmoqda', mediaIds: [] },
      });
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setFeedbackPending(false);
    }
  }

  async function sendReport() {
    if (!reportReason.trim()) return;
    setReportPending(true);
    setActionError(null);
    try {
      await api('/reports', {
        method: 'POST',
        json: { targetType: 'POST', targetId: id, reason: reportReason.trim() },
      });
      setReportOpen(false);
      setReportReason('');
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setReportPending(false);
    }
  }

  if (loading && !issue) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !issue) {
    return (
      <Screen>
        <Text style={{ color: colors.danger }}>{error ?? 'Topilmadi'}</Text>
        <Button title="Qayta urinish" variant="secondary" onPress={reload} />
      </Screen>
    );
  }

  const isMine = me?.user.id === issue.author.id;
  const isAuthorFeedbackVisible = isMine && issue.status === 'RESOLVED';

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <Text variant="title">{issue.title}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pill label={issue.categoryLabel} />
        <Pill label={issue.statusLabel} />
      </View>
      <Text variant="muted">
        {issue.author.displayName} • {formatDateTime(issue.createdAt)}
      </Text>

      {issue.duplicateOf ? (
        <Card title="Dublikat">
          <Text variant="muted">Bu post asosiy muammoga birlashtirilgan:</Text>
          <Button
            title={issue.duplicateOf.title}
            variant="secondary"
            onPress={() => router.push(`/issues/${issue.duplicateOf?.id}`)}
          />
        </Card>
      ) : null}

      <Card title="Tavsif">
        <Text>{issue.description}</Text>
        <Text variant="muted">{issue.locationText}</Text>
      </Card>

      {issue.media && issue.media.length > 0 ? (
        <Card title="Foto va video">
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {issue.media.map((m) => (
              <Image
                key={m.id}
                source={{ uri: m.thumbUrl ?? m.url }}
                style={{ width: 96, height: 96, borderRadius: 8 }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card title="Ovoz">
        <Text variant="muted">Ovozlar: {issue.voteCount ?? 0}</Text>
        {actionError ? <Text style={{ color: colors.danger }}>{actionError}</Text> : null}
        <Button
          title={issue.myVote ? 'Ovozni qaytarib olish' : 'Ovoz berish'}
          variant={issue.myVote ? 'secondary' : 'primary'}
          onPress={toggleVote}
          loading={votePending}
          disabled={!issue.myVote && !issue.canVote}
        />
        <Button
          title={issue.isFollowing ? 'Kuzatishni bekor qilish' : 'Kuzatish'}
          variant="secondary"
          onPress={toggleFollow}
          loading={followPending}
        />
      </Card>

      {issue.rejectedReason ? (
        <Card title="Rad etish sababi">
          <Text style={{ color: colors.danger }}>{issue.rejectedReason}</Text>
        </Card>
      ) : null}

      {issue.responsible || issue.resolutionText || issue.referredOrg ? (
        <Card title="Ish yuritish">
          {issue.responsible ? <Text variant="muted">Mas&apos;ul: {issue.responsible}</Text> : null}
          {issue.nextStep ? <Text variant="muted">Keyingi qadam: {issue.nextStep}</Text> : null}
          {issue.dueDate ? <Text variant="muted">Muddat: {issue.dueDate}</Text> : null}
          {issue.referredOrg ? <Text variant="muted">Yo&apos;naltirildi: {issue.referredOrg}</Text> : null}
          {issue.resolutionText ? <Text variant="muted">Yakun: {issue.resolutionText}</Text> : null}
        </Card>
      ) : null}

      {issue.history && issue.history.length > 0 ? (
        <Card title="Holat tarixi">
          {issue.history.map((h) => (
            <View key={h.id} style={{ gap: 2 }}>
              <Text variant="label">{h.toStatus ?? h.type}</Text>
              {h.reason ? <Text variant="muted">{h.reason}</Text> : null}
              <Text variant="muted">{formatDateTime(h.createdAt)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {isAuthorFeedbackVisible ? (
        <Card title="Muallif fikri">
          <Text variant="muted">Muammo hal qilindi. Natijani tasdiqlaysizmi?</Text>
          <Button
            title="Tasdiqlayman"
            variant="secondary"
            onPress={() => sendFeedback('CONFIRMED')}
            loading={feedbackPending}
          />
          <Button
            title="Hali davom etmoqda"
            variant="secondary"
            onPress={() => sendFeedback('STILL_ONGOING')}
            loading={feedbackPending}
          />
        </Card>
      ) : null}

      <Card title="Izohlar">
        {comments.loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : comments.items.length === 0 ? (
          <Text variant="muted">Izohlar yo&apos;q.</Text>
        ) : (
          comments.items.map((c) => (
            <View key={c.id} style={{ gap: 2 }}>
              <Text variant="label">{c.authorName}</Text>
              <Text>{c.text}</Text>
              <Text variant="muted">{formatDateTime(c.createdAt)}</Text>
            </View>
          ))
        )}
        {comments.hasMore ? (
          <Button
            title="Yana ko'rsatish"
            variant="secondary"
            onPress={comments.loadMore}
            loading={comments.loadingMore}
          />
        ) : null}
        <Field label="Izoh" value={comment} onChangeText={setComment} maxLength={1000} multiline />
        <Button title="Yuborish" disabled={!comment.trim()} onPress={sendComment} loading={commentPending} />
      </Card>

      <Card>
        {isMine && EDITABLE.includes(issue.status) ? (
          <ListRow title="Tahrirlash" onPress={() => router.push(`/issues/${id}/edit`)} />
        ) : null}
        <ListRow title="Shikoyat qilish" destructive onPress={() => setReportOpen((v) => !v)} />
        {reportOpen ? (
          <View style={{ gap: spacing.sm }}>
            <Field label="Sabab" value={reportReason} onChangeText={setReportReason} multiline maxLength={500} />
            <Button
              title="Shikoyatni yuborish"
              variant="danger"
              onPress={sendReport}
              loading={reportPending}
              disabled={!reportReason.trim()}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
