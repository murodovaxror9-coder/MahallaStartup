import { ApiError } from './api';
import { API_URL } from './config';
import { getToken } from './token';

export interface UploadResult {
  mediaId: string;
  kind: 'IMAGE' | 'VIDEO';
  width: number | null;
  height: number | null;
  sizeBytes: number;
}

/** POST /media (multipart: clientUploadId + file) — progress bilan (XHR). */
export function uploadMedia(
  file: { uri: string; name: string; type: string },
  clientUploadId: string,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/v1/media`);
    xhr.setRequestHeader('Accept', 'application/json');
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) {
        onProgress(100);
        resolve(data as UploadResult);
        return;
      }
      const err = (data as { error?: { code: string; message: string } } | null)?.error;
      reject(new ApiError(xhr.status, err?.code ?? 'INTERNAL_ERROR', err?.message ?? 'Fayl yuklanmadi'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Tarmoq uzildi'));
    xhr.ontimeout = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Tarmoq uzildi'));
    const form = new FormData();
    form.append('clientUploadId', clientUploadId);
    // React Native FormData fayl obyekti
    form.append('file', file as unknown as Blob);
    xhr.send(form);
  });
}
