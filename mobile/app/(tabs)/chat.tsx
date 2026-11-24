import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ApiError, api, newKey } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { ChatMessage, Page } from '@/lib/types';
import { useTheme } from '@/theme';

// API: GET  /chat/messages?before=<cursor>&limit=30  |  ?after=<messageId>  (uzilishdan keyin)
//      POST /chat/messages { text, clientMessageId }  (idempotent)
// Eslatma: Socket.IO /chat (message:new) ulanmagan — buning o'rniga 7 soniyalik polling ishlatiladi.
const POLL_MS = 7000;

export default function ChatScreen() {
  const { colors, spacing, radius } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const latestIdRef = useRef<string | null>(null);

  useEffect(() => {
    latestIdRef.current = messages[0]?.id ?? null;
  }, [messages]);

  const loadInitial = useCallback(() => {
    return api<Page<ChatMessage>>('/chat/messages')
      .then((p) => {
        setMessages(p.items);
        setHasMore(p.nextCursor !== null);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi'))
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
    const oldest = messages[messages.length - 1]?.id;
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    api<Page<ChatMessage>>(`/chat/messages?before=${oldest}`)
      .then((p) => {
        setMessages((prev) => [...prev, ...p.items]);
        setHasMore(p.nextCursor !== null);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }

  async function send() {
    const value = text.trim();
    if (!value) return;
    setSending(true);
    setText('');
    setError(null);
    try {
      const msg = await api<ChatMessage>('/chat/messages', {
        method: 'POST',
        json: { text: value, clientMessageId: newKey() },
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
      setText(value);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {error ? (
          <Text style={{ color: colors.danger, padding: spacing.md }}>{error}</Text>
        ) : null}

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text variant="muted" style={{ textAlign: 'center' }}>
              Yuklanmoqda...
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
            <EmptyState title="Chat bo'sh" hint="Mahalla bilan birinchi bo'lib yozing." />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            onEndReached={hasMore ? loadOlder : undefined}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.mine ? 'flex-end' : 'flex-start',
                  backgroundColor: item.mine ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  borderWidth: item.mine ? 0 : 1,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                  maxWidth: '80%',
                  gap: 2,
                  marginBottom: spacing.xs,
                }}
              >
                {!item.mine ? (
                  <Text variant="label" style={{ color: colors.muted }}>
                    {item.senderName}
                  </Text>
                ) : null}
                <Text style={{ color: item.mine ? colors.primaryText : colors.text }}>{item.text}</Text>
                <Text style={{ color: item.mine ? colors.primaryText : colors.muted, fontSize: 11 }}>
                  {formatDateTime(item.createdAt)}
                </Text>
              </View>
            )}
          />
        )}

        <View style={{ padding: 12, gap: 8 }}>
          <Field label="Xabar" value={text} onChangeText={setText} placeholder="Xabar yozing..." maxLength={1000} />
          <Button title="Yuborish" disabled={!text.trim()} loading={sending} onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
