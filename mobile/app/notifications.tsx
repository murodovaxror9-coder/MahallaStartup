import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

// API: GET /notifications?cursor   GET /notifications/unread-count
//      POST /notifications/:id/read   POST /notifications/read-all
// Push `data`: { notificationId, type, entityType, entityId } -> deep link (docs/FOR_CLIENTS.md)
export default function NotificationsScreen() {
  return (
    <Screen>
      <Button title="Hammasini o'qilgan deb belgilash" variant="secondary" disabled />
      <EmptyState title="Bildirishnomalar yo'q" hint="Muammo holati, tadbir va e'lonlar haqida xabarlar shu yerda." />
    </Screen>
  );
}
