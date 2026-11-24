import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Pill, StatusBadge } from '@/components/Pill';
import { Text } from '@/components/Text';
import { Notice, OptionSheet, RoundIconButton, Skeleton, Toast } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { formatDateTime, formatYmd } from '@/lib/format';
import { useApi, useMe, usePagedList } from '@/lib/hooks';
import { ISSUE_STATUS_LABELS } from '@/lib/labels';
import type { CommentItem, CurrentRoundData, IssueDetail, IssueHistoryItem } from '@/lib/types';
import { C, CATEGORY, F, radius } from '@/theme';

const EDITABLE = ['PENDING_REVIEW', 'REJECTED'];
const REPORT_REASONS = [
  'Haqoratli yoki nomaqbul kontent',
  'Spam yoki reklama',
  'Shaxsiy ma’lumot oshkor qilingan',
  'Noto‘g‘ri yoki yolg‘on ma’lumot',
];

function historyTitle(h: IssueHistoryItem): { title: string; negative?: boolean } {
  if (h.type === 'AUTHOR_FEEDBACK') {
    const t = (h.payload as { type?: string }).type;
    return t === 'STILL_ONGOING'
      ? { title: 'Muallif: muammo davom etmoqda', negative: true }
      : { title: 'Muallif natijani tasdiqladi' };
  }
  if (h.type === 'CARRY_OVER') return { title: 'Keyingi oy ovoziga o‘tkazildi' };
  if (h.type === 'DETAILS_CHANGE') return { title: 'Ish ma’lumotlari yangilandi' };
  if (h.toStatus) return { title: ISSUE_STATUS_LABELS[h.toStatus] ?? h.toStatus, negative: h.toStatus === 'REJECTED' };
  return { title: 'Yangilandi' };
}

// API: GET  /issues/:id -> media URL'lar, voteCount, myVote, isFollowing, statusLabel, tarix, duplicateOf, canVote
//      GET  /rounds/current (qolgan ovozlar)
//      PUT|DELETE /issues/:id/vote        PUT|DELETE /issues/:id/follow
//      GET|POST   /issues/:id/comments    POST /issues/:id/feedback { type, comment, mediaIds[] }
//      POST /reports { targetType: POST, targetId, reason }
export default function IssueDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: me } = useMe();
  const { data, loading, error, reload } = useApi<IssueDetail>(`/issues/${id}`);
  const { data: round, reload: reloadRound } = useApi<CurrentRoundData>('/rounds/current');
  const comments = usePagedList<CommentItem>(`/issues/${id}/comments`);

  const [patch, setPatch] = useState<Partial<IssueDetail>>({});
  const [votePending, setVotePending] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [comment, setComment] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [feedback, setFeedback] = useState<'STILL_ONGOING' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [menu, setMenu] = useState<'main' | 'report' | null>(null);
  const [slide, setSlide] = useState(0);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const commentsY = useRef(0);

  const issue = data ? { ...data, ...patch } : null;
  const isMine = !!issue && me?.user.id === issue.author.id;
  const votesLeft = round?.votesLeft ?? 0;
  const roundOpen = round?.round.status === 'OPEN';
  const inVoting = issue?.status === 'OPEN' && issue.voteCount !== null && issue.voteCount !== undefined;

  async function refreshAll() {
    setPatch({});
    await Promise.all([reload(), reloadRound(), comments.reload()]);
  }

  async function toggleVote() {
    if (!issue) return;
    const was = !!issue.myVote;
    const count = issue.voteCount ?? 0;
    setPatch((p) => ({ ...p, myVote: !was, voteCount: count + (was ? -1 : 1) }));
    setVotePending(true);
    try {
      await api(`/issues/${id}/vote`, { method: was ? 'DELETE' : 'PUT' });
      await reloadRound();
    } catch (e) {
      setPatch((p) => ({ ...p, myVote: was, voteCount: count }));
      setToast({ text: errorText(e), tone: 'error' });
    } finally {
      setVotePending(false);
    }
  }

  async function toggleFollow() {
    if (!issue) return;
    const was = !!issue.isFollowing;
    setPatch((p) => ({ ...p, isFollowing: !was }));
    setFollowPending(true);
    try {
      await api(`/issues/${id}/follow`, { method: was ? 'DELETE' : 'PUT' });
    } catch (e) {
      setPatch((p) => ({ ...p, isFollowing: was }));
      setToast({ text: errorText(e), tone: 'error' });
    } finally {
      setFollowPending(false);
    }
  }

  async function sendComment() {
    const text = comment.trim();
    if (!text) return;
    setCommentPending(true);
    try {
      await api(`/issues/${id}/comments`, { method: 'POST', json: { text } });
      setComment('');
      await comments.reload();
      setPatch((p) => ({ ...p, commentCount: (issue?.commentCount ?? 0) + 1 }));
    } catch (e) {
      setToast({ text: errorText(e), tone: 'error' });
    } finally {
      setCommentPending(false);
    }
  }

  async function sendFeedback(type: 'CONFIRMED' | 'STILL_ONGOING') {
    const text = type === 'CONFIRMED' ? 'Natijani tasdiqlayman' : feedbackText.trim();
    if (text.length < 3) return;
    setFeedbackPending(true);
    try {
      await api(`/issues/${id}/feedback`, { method: 'POST', json: { type, comment: text, mediaIds: [] } });
      setFeedback(null);
      setFeedbackText('');
      setToast({ text: 'Fikringiz yuborildi', tone: 'ok' });
      setPatch({});
      await reload();
    } catch (e) {
      setToast({ text: errorText(e), tone: 'error' });
    } finally {
      setFeedbackPending(false);
    }
  }

  async function report(reason: string) {
    try {
      await api('/reports', { method: 'POST', json: { targetType: 'POST', targetId: id, reason } });
      setToast({ text: 'Shikoyat yuborildi. Rahmat!', tone: 'ok' });
    } catch (e) {
      setToast({ text: errorText(e), tone: 'error' });
    }
  }

  const media = (issue?.media ?? []).filter((m) => m.kind === 'IMAGE');
  const cat = issue ? CATEGORY[issue.category as keyof typeof CATEGORY] : undefined;
  const history = [...(issue?.history ?? [])].reverse();

  let voteButton: React.ReactNode = null;
  if (issue && inVoting) {
    if (issue.myVote) {
      voteButton = (
        <Button title="Ovoz berildi · Qaytarib olish" icon="Check" variant="secondary" loading={votePending} onPress={toggleVote} disabled={!roundOpen} />
      );
    } else if (!roundOpen) {
      voteButton = <Button title="Davr yopilgan" disabled />;
    } else if (votesLeft <= 0) {
      voteButton = (
        <View style={{ gap: 6 }}>
          <Button title="Ovozlar tugadi" disabled />
          <Text variant="small" style={{ textAlign: 'center' }}>
            3 ta ovozdan 3 tasi berilgan
          </Text>
        </View>
      );
    } else {
      voteButton = <Button title="Ovoz berish" loading={votePending} onPress={toggleVote} disabled={!issue.canVote && !votePending} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {error && !issue ? (
        <View style={{ flex: 1, paddingTop: insets.top + 40 }}>
          <ErrorState message={error} onRetry={refreshAll} />
          <Button title="Orqaga" variant="ghost" onPress={() => router.back()} />
        </View>
      ) : !issue ? (
        <View style={{ flex: 1, padding: 16, paddingTop: insets.top + 16 }}>
          {loading ? <Skeleton count={3} height={150} /> : null}
        </View>
      ) : (
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Media karusel */}
          <View style={{ height: 200 + insets.top, backgroundColor: C.heroBg }}>
            {media.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
              >
                {media.map((m) => (
                  <Image key={m.id} source={{ uri: m.url }} style={{ width, height: 200 + insets.top }} contentFit="cover" transition={150} />
                ))}
              </ScrollView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, gap: 6 }}>
                <Icon name={cat?.icon ?? 'Image'} size={34} color={C.warnFg} strokeWidth={1.6} />
                <Text style={{ fontSize: 12, fontFamily: F.semibold, color: C.warnFg }}>{cat?.label ?? issue.categoryLabel}</Text>
              </View>
            )}
            {media.length > 1 ? (
              <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 5 }}>
                {media.map((m, i) => (
                  <View
                    key={m.id}
                    style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === slide ? C.ink : 'rgba(29,35,33,0.3)' }}
                  />
                ))}
              </View>
            ) : null}
            <View
              style={{
                position: 'absolute',
                top: insets.top + 10,
                left: 14,
                right: 14,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <RoundIconButton icon="ChevronLeft" label="Orqaga" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
              <RoundIconButton icon="Ellipsis" label="Boshqa amallar" onPress={() => setMenu('main')} />
            </View>
          </View>

          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={issue.status} statusLabel={issue.statusLabel} />
              <Pill label={cat?.label ?? issue.categoryLabel} />
            </View>
            <Text variant="h1">{issue.title}</Text>
            {issue.locationText ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="MapPin" size={16} color={C.ink2} />
                <Text style={{ fontSize: 14, color: C.ink2, flex: 1 }}>{issue.locationText}</Text>
              </View>
            ) : null}

            {issue.hidden ? <Notice tone="warn">{issue.hiddenNotice ?? 'Bu post yashirilgan'}</Notice> : null}

            {issue.description ? <Text style={{ fontSize: 15, lineHeight: 23 }}>{issue.description}</Text> : null}

            {issue.duplicateOf ? (
              <Card onPress={() => router.push(`/issues/${issue.duplicateOf?.id}`)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="small">Asosiy postga birlashtirilgan</Text>
                  <Text variant="bodyStrong">{issue.duplicateOf.title}</Text>
                </View>
                <Icon name="ChevronRight" size={20} color={C.muted} />
              </Card>
            ) : null}

            {issue.status === 'REJECTED' && isMine ? (
              <View style={{ gap: 8 }}>
                <Notice tone="error" title="Tuzatish kerak.">
                  {issue.rejectedReason ?? 'Admin postni qaytardi.'}
                </Notice>
                <Button title="Tahrirlash" icon="Pencil" variant="secondary" onPress={() => router.push(`/issues/${id}/edit`)} />
              </View>
            ) : null}

            {inVoting ? (
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={{ fontSize: 26, lineHeight: 30, fontFamily: F.bold }}>{issue.voteCount ?? 0}</Text>
                    <Text style={{ fontSize: 15, color: C.ink2 }}>ovoz</Text>
                  </View>
                  {round ? <Text variant="small">Sizda {votesLeft} ta ovoz qoldi</Text> : null}
                </View>
                {voteButton}
                <Button
                  title={issue.isFollowing ? 'Kuzatilmoqda' : 'Kuzatish'}
                  icon="Bell"
                  variant="secondary"
                  size="md"
                  loading={followPending}
                  onPress={toggleFollow}
                />
              </Card>
            ) : !issue.hidden && issue.status !== 'PENDING_REVIEW' && issue.status !== 'REJECTED' ? (
              <Button
                title={issue.isFollowing ? 'Kuzatilmoqda' : 'Kuzatish'}
                icon="Bell"
                variant="secondary"
                size="md"
                loading={followPending}
                onPress={toggleFollow}
              />
            ) : null}

            {issue.responsible || issue.nextStep || issue.dueDate || issue.referredOrg || issue.resolutionText ? (
              <Card title="Ish yuritish" style={{ gap: 6 }}>
                {issue.responsible ? <InfoLine label="Mas’ul" value={issue.responsible} /> : null}
                {issue.nextStep ? <InfoLine label="Keyingi qadam" value={issue.nextStep} /> : null}
                {issue.dueDate ? <InfoLine label="Muddat" value={formatYmd(issue.dueDate)} /> : null}
                {issue.referredOrg ? <InfoLine label="Tashkilot" value={issue.referredOrg} /> : null}
                {issue.resolutionText ? <InfoLine label="Natija" value={issue.resolutionText} /> : null}
              </Card>
            ) : null}

            {isMine && issue.status === 'RESOLVED' ? (
              <Card title="Natija sizni qoniqtirdimi?" style={{ gap: 10 }}>
                {feedback === 'STILL_ONGOING' ? (
                  <>
                    <Field
                      label="Nima davom etmoqda?"
                      value={feedbackText}
                      onChangeText={setFeedbackText}
                      multiline
                      maxLength={1000}
                      placeholder="Qisqacha yozing"
                    />
                    <Button
                      title="Yuborish"
                      variant="danger"
                      loading={feedbackPending}
                      disabled={feedbackText.trim().length < 3}
                      onPress={() => sendFeedback('STILL_ONGOING')}
                    />
                  </>
                ) : (
                  <>
                    <Button title="Natijani tasdiqlayman" icon="Check" loading={feedbackPending} onPress={() => sendFeedback('CONFIRMED')} />
                    <Button title="Muammo davom etmoqda" variant="danger" onPress={() => setFeedback('STILL_ONGOING')} />
                  </>
                )}
              </Card>
            ) : null}

            {history.length > 0 ? (
              <View style={{ gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="h2">Holat tarixi</Text>
                  <Pressable onPress={() => scrollRef.current?.scrollTo({ y: commentsY.current, animated: true })} hitSlop={8}>
                    <Text style={{ fontSize: 14, fontFamily: F.semibold, color: C.primary, textDecorationLine: 'underline' }}>
                      {issue.commentCount ?? 0} izoh
                    </Text>
                  </Pressable>
                </View>
                <View>
                  {history.map((h, i) => {
                    const t = historyTitle(h);
                    const lastItem = i === history.length - 1;
                    const by = h.actorName ?? (h.toStatus === 'PENDING_REVIEW' ? issue.author.displayName : null);
                    return (
                      <View key={h.id} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ alignItems: 'center', width: 14 }}>
                          <View
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              borderWidth: 2,
                              marginTop: 3,
                              borderColor: t.negative ? C.danger : i === 0 ? C.primary : C.muted,
                              backgroundColor: t.negative ? C.dangerBg : C.surface,
                            }}
                          />
                          {!lastItem ? <View style={{ flex: 1, width: 2, backgroundColor: C.line, marginVertical: 2 }} /> : null}
                        </View>
                        <View style={{ flex: 1, paddingBottom: lastItem ? 0 : 14, gap: 2 }}>
                          <Text variant="bodyStrong" style={{ fontSize: 15, lineHeight: 20, color: t.negative ? C.danger : C.ink }}>
                            {t.title}
                          </Text>
                          <Text variant="small">
                            {formatDateTime(h.createdAt)}
                            {by ? ` · ${by}` : ''}
                          </Text>
                          {h.reason ? <Text style={{ fontSize: 14, color: C.ink2 }}>{h.reason}</Text> : null}
                          {h.media.length > 0 ? (
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                              {h.media.map((m) => (
                                <Image
                                  key={m.id}
                                  source={{ uri: m.thumbUrl ?? m.url }}
                                  style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: C.surface2 }}
                                />
                              ))}
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Izohlar */}
            {!issue.hidden && issue.status !== 'PENDING_REVIEW' && issue.status !== 'REJECTED' ? (
              <View onLayout={(e) => (commentsY.current = e.nativeEvent.layout.y + 200 + insets.top)} style={{ gap: 10, marginTop: 8 }}>
                <Text variant="h2">Izohlar</Text>
                {comments.loading && comments.items.length === 0 ? (
                  <Skeleton count={2} height={60} />
                ) : comments.items.length === 0 ? (
                  <Text variant="small">Hali izoh yo‘q. Birinchi bo‘lib yozing.</Text>
                ) : (
                  comments.items.map((c) => (
                    <View key={c.id} style={{ backgroundColor: C.surface, borderRadius: radius.md, borderWidth: 1, borderColor: C.lineSoft, padding: 12, gap: 3 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ fontSize: 13, fontFamily: F.semibold, color: C.primary }}>{c.authorName}</Text>
                        <Text variant="small" style={{ fontSize: 12 }}>
                          {formatDateTime(c.createdAt)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, lineHeight: 21 }}>{c.text}</Text>
                    </View>
                  ))
                )}
                {comments.hasMore ? (
                  <Button title="Yana ko‘rsatish" variant="ghost" size="sm" loading={comments.loadingMore} onPress={comments.loadMore} />
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Izoh yozing..."
                    placeholderTextColor={C.muted}
                    multiline
                    maxLength={1000}
                    style={{
                      flex: 1,
                      minHeight: 46,
                      maxHeight: 120,
                      backgroundColor: C.surface,
                      borderWidth: 1,
                      borderColor: C.line,
                      borderRadius: 23,
                      paddingHorizontal: 16,
                      paddingTop: 12,
                      paddingBottom: 12,
                      fontSize: 15,
                      fontFamily: F.regular,
                      color: C.ink,
                    }}
                  />
                  <Pressable
                    onPress={sendComment}
                    disabled={!comment.trim() || commentPending}
                    accessibilityLabel="Izohni yuborish"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: C.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: !comment.trim() || commentPending ? 0.5 : 1,
                    }}
                  >
                    <Icon name="SendHorizontal" size={20} color={C.onPrimary} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <BottomNav active="feed" />

      <OptionSheet
        visible={menu === 'main'}
        title="Amallar"
        options={[
          ...(isMine && issue && EDITABLE.includes(issue.status)
            ? [{ value: 'edit', label: 'Tahrirlash', icon: 'Pencil' as const }]
            : []),
          { value: 'refresh', label: 'Yangilash', icon: 'RotateCw' as const },
          ...(!isMine ? [{ value: 'report', label: 'Shikoyat qilish', icon: 'Flag' as const, destructive: true }] : []),
        ]}
        onSelect={(v) => {
          if (v === 'edit') router.push(`/issues/${id}/edit`);
          if (v === 'refresh') void refreshAll();
          if (v === 'report') setTimeout(() => setMenu('report'), 250);
        }}
        onClose={() => setMenu((m) => (m === 'main' ? null : m))}
      />
      <OptionSheet
        visible={menu === 'report'}
        title="Shikoyat sababi"
        options={REPORT_REASONS.map((r) => ({ value: r, label: r }))}
        onSelect={(v) => v && void report(v)}
        onClose={() => setMenu(null)}
      />
      <Toast message={toast?.text ?? null} tone={toast?.tone} onHide={() => setToast(null)} />
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ fontSize: 14, lineHeight: 20, color: C.ink2 }}>
      <Text style={{ fontSize: 14, fontFamily: F.semibold, color: C.ink }}>{label}: </Text>
      {value}
    </Text>
  );
}
