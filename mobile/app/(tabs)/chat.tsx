import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { OptionSheet, Toast } from '@/components/ui';
import { api, newKey } from '@/lib/api';
import { errorText } from '@/lib/errors';
import { formatDate, formatTime, isSameDay } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import type { ChatMessage, Page } from '@/lib/types';
import { C, F } from '@/theme';

// API: GET  /chat/messages?before=<id>  |  ?after=<id>  (uzilishdan keyin)
//      POST /chat/messages { text, clientMessageId }  (idempotent)
//      POST /reports { targetType: CHAT_MESSAGE, targetId, reason }
// Real vaqt: 5 soniyalik `after=` so'rovi (Socket.IO o'rniga — mobil tarmoqda barqaror).
const POLL_MS = 5000;

type Local = ChatMessage & { local?: 'sending' | 'failed'; clientId?: string };

function dayLabel(iso: string): string {
  const now = new Date().toISOString();
  if (isSameDay(iso, now)) return 'Bugun';
  const y = new Date(Date.now() - 86_400_000).toISOString();
  if (isSameDay(iso, y)) return 'Kecha';
  return formatDate(iso);
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { data: me } = useMe();
  const [messages, setMessages] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const latestIdRef = useRef<string | null>(null);

  useEffect(() => {
    latestIdRef.current = messages.find((m) => !m.local)?.id ?? null;
  }, [messages]);

  const loadInitial = useCallback(() => {
    return api<Page<ChatMessage>>('/chat/messages')
      .then((p) => {
        setMessages(p.items);
        setHasMore(p.nextCursor !== null);
        setError(null);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const t = setInterval(() => {
      const after = latestIdRef.current;
      if (!after) return;
      api<Page<ChatMessage>>(`/chat/messages?after=${after}`)
        .then((p) => {
          if (p.items.length === 0) return;
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = p.items.filter((m) => !known.has(m.id)).reverse();
            return fresh.length > 0 ? [...fresh, ...prev] : prev;
          });
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(t);
  }, []);

  function loadOlder() {
    const oldest = [...messages].reverse().find((m) => !m.local)?.id;
    if (!oldest || loadingMore || !hasMore) return;
    setLoadingMore(true);
    api<Page<ChatMessage>>(`/chat/messages?before=${oldest}`)
      .then((p) => {
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          return [...prev, ...p.items.filter((m) => !known.has(m.id))];
        });
        setHasMore(p.nextCursor !== null);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }

  async function deliver(clientId: string, value: string) {
    setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, local: 'sending' } : m)));
    try {
      const msg = await api<ChatMessage>('/chat/messages', {
        method: 'POST',
        json: { text: value, clientMessageId: clientId },
      });
      setMessages((prev) => {
        const without = prev.filter((m) => m.clientId !== clientId && m.id !== msg.id);
        return [{ ...msg, mine: true }, ...without];
      });
    } catch {
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...m, local: 'failed' } : m)));
    }
  }

  function send() {
    const value = text.trim();
    if (!value) return;
    const clientId = newKey();
    setText('');
    setMessages((prev) => [
      {
        id: `local-${clientId}`,
        clientId,
        text: value,
        senderId: me?.user.id ?? '',
        senderName: me?.user.displayName ?? '',
        mine: true,
        createdAt: new Date().toISOString(),
        local: 'sending',
      },
      ...prev,
    ]);
    void deliver(clientId, value);
  }

  async function report(reason: string) {
    if (!reportTarget) return;
    try {
      await api('/reports', { method: 'POST', json: { targetType: 'CHAT_MESSAGE', targetId: reportTarget, reason } });
      setToast({ text: 'Shikoyat yuborildi', tone: 'ok' });
    } catch (e) {
      setToast({ text: errorText(e), tone: 'error' });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.lineSoft }}>
        <Text variant="h2" numberOfLines={1}>
          {me ? `${me.mahalla.name} chati` : 'Mahalla chati'}
        </Text>
        <Text variant="small">Faqat shu mahalla a’zolari ko‘radi</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {error && messages.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              void loadInitial();
            }}
          />
        ) : loading && messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState icon="MessageSquare" title="Chat hozircha bo‘sh" hint="Mahalladoshlar bilan birinchi bo‘lib salomlashing." />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ alignSelf: 'center', backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 }}>
                  <Text variant="small" style={{ fontSize: 12 }}>
                    Oldingi xabarlar yuklanmoqda...
                  </Text>
                </View>
              ) : undefined
            }
            renderItem={({ item, index }) => {
              const older = messages[index + 1];
              const showDay = !older || !isSameDay(older.createdAt, item.createdAt);
              const showName = !item.mine && (!older || older.senderId !== item.senderId || showDay);
              return (
                <View>
                  {showDay ? (
                    <Text style={{ textAlign: 'center', fontSize: 12, fontFamily: F.semibold, color: C.ink2, marginVertical: 10 }}>
                      {dayLabel(item.createdAt)}
                    </Text>
                  ) : null}
                  <Bubble
                    msg={item}
                    showName={showName}
                    onRetry={() => item.clientId && void deliver(item.clientId, item.text)}
                    onLongPress={() => !item.mine && !item.local && setReportTarget(item.id)}
                  />
                </View>
              );
            }}
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: C.bg,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Xabar yozing..."
            placeholderTextColor={C.muted}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 120,
              backgroundColor: C.surface2,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingTop: 13,
              paddingBottom: 13,
              fontSize: 16,
              fontFamily: F.regular,
              color: C.ink,
            }}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Yuborish"
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? C.primaryPressed : C.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: text.trim() ? 1 : 0.55,
            })}
          >
            <Icon name="Send" size={20} color={C.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={reportTarget !== null}
        title="Xabar ustidan shikoyat"
        options={[
          { value: 'Haqoratli yoki nomaqbul xabar', label: 'Haqoratli yoki nomaqbul xabar' },
          { value: 'Spam yoki reklama', label: 'Spam yoki reklama' },
          { value: 'Shaxsiy ma’lumot oshkor qilingan', label: 'Shaxsiy ma’lumot oshkor qilingan' },
        ]}
        onSelect={(v) => v && void report(v)}
        onClose={() => setReportTarget(null)}
      />
      <Toast message={toast?.text ?? null} tone={toast?.tone} onHide={() => setToast(null)} />
    </View>
  );
}

function Bubble({
  msg,
  showName,
  onRetry,
  onLongPress,
}: {
  msg: Local;
  showName: boolean;
  onRetry: () => void;
  onLongPress: () => void;
}) {
  const failed = msg.local === 'failed';
  return (
    <View style={{ alignItems: msg.mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      {showName ? (
        <Text style={{ fontSize: 13, fontFamily: F.semibold, color: C.primary, marginBottom: 3, marginLeft: 2 }}>
          {msg.senderName}
        </Text>
      ) : null}
      <Pressable
        onPress={failed ? onRetry : undefined}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={{
          maxWidth: '82%',
          backgroundColor: msg.mine && !failed ? C.primarySoft : C.surface,
          borderWidth: 1,
          borderColor: failed ? C.danger : msg.mine ? '#C8E1D6' : C.lineSoft,
          borderRadius: 16,
          borderBottomRightRadius: msg.mine ? 6 : 16,
          borderBottomLeftRadius: msg.mine ? 16 : 6,
          paddingHorizontal: 13,
          paddingVertical: 9,
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 21, color: C.ink }}>{msg.text}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, marginHorizontal: 2 }}>
        {failed ? (
          <Pressable onPress={onRetry} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="RotateCcw" size={12} color={C.danger} strokeWidth={2.4} />
            <Text style={{ fontSize: 11, fontFamily: F.semibold, color: C.danger }}>Yuborilmadi · qayta yuborish</Text>
          </Pressable>
        ) : msg.local === 'sending' ? (
          <>
            <Text style={{ fontSize: 11, color: C.muted }}>Yuborilmoqda</Text>
            <Icon name="Clock" size={11} color={C.muted} />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: C.muted }}>{formatTime(msg.createdAt)}</Text>
            {msg.mine ? <Icon name="Check" size={12} color={C.primary} strokeWidth={2.6} /> : null}
          </>
        )}
      </View>
    </View>
  );
}
