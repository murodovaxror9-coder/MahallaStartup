import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';

// API: GET  /chat/messages?before=<cursor>&limit=30  |  ?after=<messageId>  (uzilishdan keyin)
//      POST /chat/messages { text, clientMessageId }  (idempotent)
//      Socket.IO namespace /chat: message:new, message:hidden
export default function ChatScreen() {
  const [text, setText] = useState('');

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <EmptyState title="Chat bo'sh" hint="Mahalla bilan birinchi bo'lib yozing." />
        </View>
        <View style={{ padding: 12, gap: 8 }}>
          <Field label="Xabar" value={text} onChangeText={setText} placeholder="Xabar yozing..." />
          <Button title="Yuborish" disabled={!text.trim()} onPress={() => setText('')} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
