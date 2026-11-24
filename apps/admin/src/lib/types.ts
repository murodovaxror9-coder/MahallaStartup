// API shartnomasi turlari. Manba: docs/api-contract.md (backend egasi tasdiqlaydi).
// Barcha vaqtlar ISO 8601 UTC satr. Ko'rsatishda Asia/Tashkent ishlatiladi.

export type Role = 'RESIDENT' | 'ADMIN' | 'OPERATOR';
export type IssueStatus =
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'OPEN'
  | 'SELECTED'
  | 'IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED';
export type Category = 'ROAD' | 'LIGHTING' | 'WASTE' | 'WATER' | 'LANDSCAPING' | 'OTHER';

export interface Ref {
  id: string;
  displayName: string;
}

export interface Me {
  id: string;
  displayName: string;
  login: string;
  role: Role;
  mahalla: { id: string; name: string };
  mustChangePassword: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface UserRow {
  id: string;
  displayName: string;
  login: string;
  phone: string | null;
  role: Role;
  status: 'ACTIVE' | 'BLOCKED';
  mustChangePassword: boolean;
  tempPasswordExpiresAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TempPassword {
  user: UserRow;
  temporaryPassword: string;
  expiresAt: string;
}

export interface Media {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string; // qisqa muddatli o'qish havolasi
  mime: string;
  size: number;
}

export interface IssueSummary {
  id: string;
  title: string;
  category: Category;
  status: IssueStatus;
  locationText: string;
  author: Ref;
  voteCount: number;
  inCurrentRound: boolean;
  createdAt: string;
  publishedAt: string | null;
  dueDate: string | null;
  thumbnailUrl: string | null;
  hidden: boolean;
}

export interface IssueUpdate {
  id: string;
  kind: 'STATUS' | 'AUTHOR_CONFIRMED' | 'AUTHOR_DISPUTED' | 'NOTE';
  status: IssueStatus;
  at: string;
  actor: Ref;
  note: string | null;
  reason: string | null;
  media: Media[];
}

export interface IssueDetail extends IssueSummary {
  description: string;
  media: Media[];
  updates: IssueUpdate[];
  rejectionReason: string | null;
  primaryIssueId: string | null;
  responsible: string | null;
  nextStep: string | null;
  organization: string | null;
  referredAt: string | null;
  followUpAt: string | null;
  resolutionText: string | null;
  commentCount: number;
}

export type StatusChange =
  | { status: 'IN_PROGRESS'; responsible: string; nextStep: string; dueDate: string; reason?: string }
  | { status: 'REFERRED'; organization: string; referredAt: string; followUpAt: string; reason?: string }
  | { status: 'RESOLVED'; resolutionText: string; mediaIds: string[] };

export interface RoundResult {
  closedAt: string;
  winner: IssueSummary | null;
  tally: { issueId: string; title: string; votes: number }[];
}

export interface Round {
  id: string;
  month: string; // YYYY-MM
  startsAt: string;
  endsAt: string;
  status: 'OPEN' | 'CLOSED';
  entryCount: number;
  voterCount: number;
  result: RoundResult | null;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  organizer: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  rsvpCount: number;
  cancelReason: string | null;
  resultText: string | null;
  resultMedia: Media[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  important: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt: string | null;
}

export interface Report {
  id: string;
  targetType: 'ISSUE' | 'COMMENT' | 'CHAT_MESSAGE';
  targetId: string;
  targetPreview: string;
  targetAuthor: Ref;
  reason: string;
  reporter: Ref;
  status: 'OPEN' | 'HIDDEN' | 'DISMISSED';
  createdAt: string;
  resolutionNote: string | null;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: Ref;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
}

export interface Dashboard {
  round: Round;
  activeVoters: number;
  residents: number;
  pendingModeration: number;
  openReports: number;
  overdueIssues: IssueSummary[];
  nextEvent: EventItem | null;
}
