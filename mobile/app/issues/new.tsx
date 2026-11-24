import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Header, Notice } from '@/components/ui';
import { api, newKey } from '@/lib/api';
import { errorText } from '@/lib/errors';
import type { IssueDetail } from '@/lib/types';
import { uploadMedia } from '@/lib/upload';
import { C, CATEGORY, F, radius } from '@/theme';

const DRAFT_KEY = 'mhd_issue_draft';
const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;
const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;

type UploadState = 'uploading' | 'done' | 'error';
interface MediaSlot {
  key: string; // clientUploadId — qayta urinishda o'zgarmaydi
  uri: string;
  name: string;
  type: string;
  kind: 'IMAGE' | 'VIDEO';
  state: UploadState;
  progress: number;
  mediaId?: string;
  error?: string;
}

interface Draft {
  title: string;
  description: string;
  location: string;
  category: string | null;
}

// API: POST /media (multipart) -> { mediaId }
//      POST /issues  (header Idempotency-Key)
//        { title 5-120, description 10-2000, category, locationText 3-200, mediaIds[] (<=3 rasm, <=1 video) }
export default function NewIssueScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<IssueDetail | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  // Bir urinish = bitta kalit: tarmoq uzilib qayta yuborilsa dublikat yaratilmaydi
  const idempotencyKey = useRef(newKey()).current;

  // Qoralamani tiklash
  useEffect(() => {
    SecureStore.getItemAsync(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        const d = JSON.parse(raw) as Draft;
        setTitle(d.title ?? '');
        setDescription(d.description ?? '');
        setLocation(d.location ?? '');
        setCategory(d.category ?? null);
      })
      .catch(() => undefined)
      .finally(() => setDraftReady(true));
  }, []);

  // Qoralamani saqlash (yozish to'xtagach)
  useEffect(() => {
    if (!draftReady || done) return;
    const empty = !title && !description && !location && !category;
    const t = setTimeout(() => {
      const op = empty
        ? SecureStore.deleteItemAsync(DRAFT_KEY)
        : SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify({ title, description, location, category } satisfies Draft));
      op.then(() => setDraftSaved(!empty)).catch(() => undefined);
    }, 600);
    return () => clearTimeout(t);
  }, [title, description, location, category, draftReady, done]);

  function startUpload(slot: MediaSlot) {
    setMedia((prev) => prev.map((m) => (m.key === slot.key ? { ...m, state: 'uploading', progress: 0, error: undefined } : m)));
    uploadMedia({ uri: slot.uri, name: slot.name, type: slot.type }, slot.key, (pct) =>
      setMedia((prev) => prev.map((m) => (m.key === slot.key ? { ...m, progress: pct } : m))),
    )
      .then((r) =>
        setMedia((prev) => prev.map((m) => (m.key === slot.key ? { ...m, state: 'done', progress: 100, mediaId: r.mediaId } : m))),
      )
      .catch((e) => {
        const msg = errorText(e);
        setMedia((prev) => prev.map((m) => (m.key === slot.key ? { ...m, state: 'error', error: msg } : m)));
        setMediaError(`${slot.name}: ${msg}. Qayta urinish postni ko‘paytirmaydi.`);
      });
  }

  async function pick(source: 'library' | 'camera') {
    setMediaError(null);
    const images = media.filter((m) => m.kind === 'IMAGE').length;
    const videos = media.filter((m) => m.kind === 'VIDEO').length;
    const types: ImagePicker.MediaType[] = [];
    if (images < MAX_IMAGES) types.push('images');
    if (videos < MAX_VIDEOS && source === 'library') types.push('videos');
    if (types.length === 0) return;

    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setMediaError('Ruxsat berilmadi. Sozlamalardan kamera yoki galereyaga ruxsat bering.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: source === 'camera' ? ['images'] : types,
      quality: 0.8,
      videoMaxDuration: 60,
      allowsMultipleSelection: source === 'library',
      selectionLimit: MAX_IMAGES - images + (MAX_VIDEOS - videos),
      exif: false,
    };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;

    let imgLeft = MAX_IMAGES - images;
    let vidLeft = MAX_VIDEOS - videos;
    const added: MediaSlot[] = [];
    for (const a of res.assets) {
      const kind = a.type === 'video' ? 'VIDEO' : 'IMAGE';
      if (kind === 'IMAGE' && imgLeft <= 0) continue;
      if (kind === 'VIDEO' && vidLeft <= 0) continue;
      const max = kind === 'IMAGE' ? IMAGE_MAX : VIDEO_MAX;
      if (a.fileSize && a.fileSize > max) {
        setMediaError(kind === 'IMAGE' ? 'Rasm 5 MB dan oshmasin.' : 'Video 25 MB dan oshmasin.');
        continue;
      }
      const mime = a.mimeType ?? (kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg');
      const ext = mime.split('/')[1]?.replace('quicktime', 'mov').replace('jpeg', 'jpg') ?? 'jpg';
      added.push({
        key: newKey(),
        uri: a.uri,
        name: a.fileName ?? `${kind === 'VIDEO' ? 'video' : 'rasm'}-${Date.now()}.${ext}`,
        type: mime,
        kind,
        state: 'uploading',
        progress: 0,
      });
      if (kind === 'IMAGE') imgLeft--;
      else vidLeft--;
    }
    if (added.length === 0) return;
    setMedia((prev) => [...prev, ...added]);
    added.forEach(startUpload);
  }

  const titleOk = title.trim().length >= 5;
  const descOk = description.trim().length >= 10;
  const locOk = location.trim().length >= 3;
  const uploading = media.some((m) => m.state === 'uploading');
  const failed = media.some((m) => m.state === 'error');
  const valid = titleOk && descOk && locOk && !!category && !uploading && !failed;

  async function submit() {
    if (!valid || !category) return;
    setPending(true);
    setError(null);
    try {
      const res = await api<IssueDetail>('/issues', {
        method: 'POST',
        json: {
          title: title.trim(),
          description: description.trim(),
          category,
          locationText: location.trim(),
          mediaIds: media.filter((m) => m.mediaId).map((m) => m.mediaId),
        },
        idempotencyKey,
      });
      await SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => undefined);
      setDone(res);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Screen
        header={<Header back title="Muammo yuborish" small />}
        footer={
          <>
            <Button title="Mening postlarim" onPress={() => router.replace('/issues/mine')} />
            <Button title="Bosh sahifaga" variant="ghost" onPress={() => router.navigate('/')} />
          </>
        }
        center
      >
        <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="CircleCheck" size={36} color={C.primary} />
          </View>
          <Text variant="h1" style={{ textAlign: 'center' }}>
            Post moderatsiyaga yuborildi
          </Text>
          <Text style={{ textAlign: 'center', color: C.ink2 }}>
            Mahalla admini tekshirgach, «{done.title}» lentaga chiqadi va ovozga qo‘yiladi. Holati haqida bildirishnoma keladi.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header back title="Muammo yuborish" small />}
      footer={
        <>
          <Button title="Muammo yuborish" onPress={submit} loading={pending} disabled={!valid} />
          <Text variant="small" style={{ textAlign: 'center', fontSize: 12 }}>
            {uploading ? 'Fayllar yuklangach faollashadi' : failed ? 'Yuklanmagan faylni qayta yuboring yoki o‘chiring' : 'Barcha maydonlarni to‘ldiring'}
            {draftSaved ? ' · qoralama saqlandi' : ''}
          </Text>
        </>
      }
    >
      <Notice tone="warn" title="Shoshilinch xavf bo‘lsa">
        (yong‘in, gaz hidi, uzilgan sim) — avval 101, 104 yoki 112 ga qo‘ng‘iroq qiling.
      </Notice>

      <Field
        label="Sarlavha"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Masalan: Bog‘ ko‘chasida chiroq ishlamayapti"
        error={title.length > 0 && !titleOk ? 'Kamida 5 belgi' : null}
      />

      <View style={{ gap: 8 }}>
        <Text variant="label">Toifa</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(CATEGORY).map(([k, v]) => {
            const selected = category === k;
            return (
              <Pressable
                key={k}
                onPress={() => setCategory(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  width: '31.5%',
                  height: 44,
                  borderRadius: radius.md,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? C.primary : C.line,
                  backgroundColor: selected ? C.primarySoft : C.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingHorizontal: 4,
                }}
              >
                {selected ? <Icon name="Check" size={14} color={C.primary} strokeWidth={2.6} /> : null}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 13, fontFamily: selected ? F.semibold : F.medium, color: selected ? C.primary : C.ink }}
                >
                  {v.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field
        label="Joy"
        value={location}
        onChangeText={setLocation}
        maxLength={200}
        placeholder="Masalan: 12-uy oldidagi ustun"
        hint="Jamoat joyi yoki mo‘ljal. Uy manzilingizni yozmang."
        error={location.length > 0 && !locOk ? 'Kamida 3 belgi' : null}
      />

      <Field
        label="Tavsif"
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        placeholder="Muammo qachondan beri, kimga xalaqit beradi?"
        error={description.length > 0 && !descOk ? 'Kamida 10 belgi' : null}
      />

      <View style={{ gap: 8 }}>
        <Text variant="label">
          Foto va video <Text variant="small">· 3 rasm (5 MB), 1 video (25 MB)</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {media.map((m) => (
            <MediaTile
              key={m.key}
              slot={m}
              onRetry={() => startUpload(m)}
              onRemove={() => setMedia((prev) => prev.filter((x) => x.key !== m.key))}
            />
          ))}
          {media.length < MAX_IMAGES + MAX_VIDEOS ? (
            <>
              <AddTile icon="Camera" label="Kamera" onPress={() => pick('camera')} />
              <AddTile icon="Image" label="Galereya" onPress={() => pick('library')} />
            </>
          ) : null}
        </View>
        {mediaError ? (
          <Text variant="small" style={{ color: C.danger }}>
            {mediaError}
          </Text>
        ) : null}
      </View>

      {error ? <Notice tone="error">{error}</Notice> : null}
    </Screen>
  );
}

const TILE = 76;

function AddTile({ icon, label, onPress }: { icon: 'Camera' | 'Image'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: TILE,
        height: TILE,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: C.line,
        backgroundColor: pressed ? C.surface2 : C.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      })}
    >
      <Icon name={icon} size={20} color={C.ink2} />
      <Text style={{ fontSize: 11, color: C.ink2, fontFamily: F.medium }}>{label}</Text>
    </Pressable>
  );
}

function MediaTile({ slot, onRetry, onRemove }: { slot: MediaSlot; onRetry: () => void; onRemove: () => void }) {
  const base = { width: TILE, height: TILE, borderRadius: radius.md, overflow: 'hidden' as const };
  return (
    <View>
      {slot.state === 'error' ? (
        <Pressable
          onPress={onRetry}
          accessibilityLabel="Qayta urinish"
          style={{ ...base, backgroundColor: C.dangerBg, borderWidth: 1, borderColor: '#F2B8B0', alignItems: 'center', justifyContent: 'center', gap: 3 }}
        >
          <Icon name="RotateCw" size={18} color={C.danger} />
          <Text style={{ fontSize: 10, fontFamily: F.semibold, color: C.danger, textAlign: 'center' }}>Qayta urinish</Text>
        </Pressable>
      ) : (
        <View style={{ ...base, backgroundColor: C.surface2 }}>
          {slot.kind === 'IMAGE' ? (
            <Image source={{ uri: slot.uri }} style={{ width: TILE, height: TILE }} contentFit="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontFamily: F.semibold, color: C.ink2 }}>VIDEO</Text>
            </View>
          )}
          {slot.state === 'uploading' ? (
            <View style={{ ...base, position: 'absolute', backgroundColor: 'rgba(246,243,236,0.86)', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 }}>
              {slot.progress > 0 ? (
                <Text style={{ fontSize: 13, fontFamily: F.bold }}>{slot.progress}%</Text>
              ) : (
                <ActivityIndicator size="small" color={C.primary} />
              )}
              <View style={{ alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: C.line }}>
                <View style={{ width: `${slot.progress}%`, height: 4, borderRadius: 2, backgroundColor: C.primary }} />
              </View>
            </View>
          ) : (
            <View style={{ position: 'absolute', right: 5, bottom: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Check" size={13} color="#fff" strokeWidth={3} />
            </View>
          )}
        </View>
      )}
      {slot.state !== 'uploading' ? (
        <Pressable
          onPress={onRemove}
          accessibilityLabel="O‘chirish"
          hitSlop={8}
          style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="X" size={13} color="#fff" strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}
