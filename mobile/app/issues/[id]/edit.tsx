import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import type { IssueDetail } from '@/lib/types';
import { useTheme } from '@/theme';

// Faqat PENDING_REVIEW / REJECTED holatdagi o'z postini tahrirlash mumkin.
// API: PATCH /issues/:id   POST /issues/:id/resubmit   DELETE /issues/:id (soft delete)
export default function EditIssueScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: issue, loading, error } = useApi<IssueDetail>(`/issues/${id}`);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [resubmitPending, setResubmitPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  // Serverdan kelgan post birinchi marta yuklanganda formani to'ldiradi (render paytida, effektsiz).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (issue && loadedId !== issue.id) {
    setLoadedId(issue.id);
    setTitle(issue.title);
    setDescription(issue.description ?? '');
    setLocation(issue.locationText ?? '');
  }

  function patchBody() {
    return { title: title.trim(), description: description.trim(), locationText: location.trim() };
  }

  async function save() {
    setSavePending(true);
    setActionError(null);
    try {
      await api(`/issues/${id}`, { method: 'PATCH', json: patchBody() });
      router.back();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setSavePending(false);
    }
  }

  async function resubmit() {
    setResubmitPending(true);
    setActionError(null);
    try {
      await api(`/issues/${id}`, { method: 'PATCH', json: patchBody() });
      await api(`/issues/${id}/resubmit`, { method: 'POST' });
      router.replace('/issues/mine');
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setResubmitPending(false);
    }
  }

  async function remove() {
    setDeletePending(true);
    setActionError(null);
    try {
      await api(`/issues/${id}`, { method: 'DELETE' });
      router.replace('/issues/mine');
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Kutilmagan xato yuz berdi');
    } finally {
      setDeletePending(false);
    }
  }

  if (loading && !issue) {
    return (
      <Screen header={<Header back title="Tahrirlash" />}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (error || !issue) {
    return (
      <Screen header={<Header back title="Tahrirlash" />}>
        <Text style={{ color: colors.danger }}>{error ?? 'Topilmadi'}</Text>
      </Screen>
    );
  }

  return (
    <Screen header={<Header back title="Tahrirlash" />}>
      <Text variant="muted">#{id}</Text>

      {issue.rejectedReason ? (
        <Card title="Rad etish sababi">
          <Text style={{ color: colors.danger }}>{issue.rejectedReason}</Text>
        </Card>
      ) : null}

      <Field label="Sarlavha" value={title} onChangeText={setTitle} maxLength={120} />
      <Field label="Tavsif" value={description} onChangeText={setDescription} maxLength={2000} multiline />
      <Field label="Joy" value={location} onChangeText={setLocation} maxLength={200} />

      {actionError ? <Text style={{ color: colors.danger }}>{actionError}</Text> : null}

      <Button title="Saqlash" variant="secondary" onPress={save} loading={savePending} />
      {issue.status === 'REJECTED' ? (
        <Button title="Qayta yuborish" onPress={resubmit} loading={resubmitPending} />
      ) : null}
      <Button title="O'chirish" variant="danger" onPress={remove} loading={deletePending} />
    </Screen>
  );
}
