// Backend javoblari (backend/openapi.yaml, docs/FOR_CLIENTS.md). Vaqtlar ISO UTC, `dueDate` kabi sanalar YYYY-MM-DD.

export type IssueStatus =
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'MERGED'
  | 'OPEN'
  | 'SELECTED'
  | 'IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED';
export type Category = 'ROAD' | 'LIGHTING' | 'WASTE' | 'WATER' | 'LANDSCAPING' | 'OTHER';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Mahalla {
  id: string;
  name: string;
  slug: string;
}

export interface Me {
  user: { id: string; login: string; displayName: string; phone: string | null; role: string; mahalla: Mahalla };
  mahalla: Mahalla;
  role: 'RESIDENT' | 'MAHALLA_ADMIN' | string;
  mustChangePassword: boolean;
  unreadNotifications: number;
}

export interface Resident {
  id: string;
  login: string;
  displayName: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  blockedReason: string | null;
  mustChangePassword: boolean;
  tempPasswordExpiresAt: string | null;
  createdAt: string;
}

export interface TempPassword {
  user: Resident;
  temporaryPassword: string;
  expiresAt: string;
}

export interface Media {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string; // 5 daqiqalik imzoli havola
  thumbUrl: string | null;
  mime: string;
}

export interface UploadedMedia {
  mediaId: string;
  kind: 'IMAGE' | 'VIDEO';
  sizeBytes: number;
}

export interface IssueListItem {
  id: string;
  title: string;
  category: Category;
  categoryLabel: string;
  locationText: string;
  status: IssueStatus;
  statusLabel: string;
  publishedAt: string | null;
  createdAt: string;
  commentCount: number;
  voteCount: number | null;
  thumbUrl: string | null;
  authorName: string;
  responsible: string | null;
  dueDate: string | null;
  hidden: boolean;
  rejectedReason: string | null;
  duplicateOf: { id: string; title: string } | null;
}

export interface HistoryItem {
  id: string;
  type: 'STATUS_CHANGE' | 'DETAILS_CHANGE' | 'AUTHOR_FEEDBACK' | 'CARRY_OVER';
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
  media: Media[];
}

export interface IssueDetail {
  id: string;
  title: string;
  category: Category;
  categoryLabel: string;
  status: IssueStatus;
  statusLabel: string;
  hidden: boolean;
  hiddenReason: string | null;
  author: { id: string; displayName: string };
  createdAt: string;
  publishedAt: string | null;
  description: string;
  locationText: string;
  media: Media[];
  voteCount: number | null;
  roundId: string | null;
  commentCount: number;
  duplicateOf: { id: string; title: string } | null;
  rejectedReason: string | null;
  responsible: string | null;
  nextStep: string | null;
  dueDate: string | null;
  referredOrg: string | null;
  referredAt: string | null;
  followUpAt: string | null;
  resolutionText: string | null;
  history: HistoryItem[];
}

export interface RoundRef {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'OPEN' | 'CLOSED' | string;
}

export interface AdminRound extends RoundRef {
  winner: { issueId: string; title: string; votes: number } | null;
  totalVoters: number | null;
  totalVotes: number | null;
}

export interface RoundResult {
  roundId: string;
  closedAt: string;
  winner: { rank: number; issueId: string; title: string; votes: number } | null;
  ranking: { rank: number; issueId: string; title: string; votes: number }[];
  totalVoters: number;
  totalVotes: number;
  message: string;
}

export interface Dashboard {
  round: RoundRef | null;
  activeVoters: number;
  totalResidents: number;
  pendingModeration: number;
  overdueIssues: number;
  openReports: number;
  nextEvent: { id: string; title: string; startsAt: string; location: string; rsvpCount: number } | null;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  organizer: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  version: number;
  resultText: string | null;
  rsvpCount: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: 'POST' | 'COMMENT' | 'CHAT_MESSAGE';
  targetId: string;
  reason: string;
  status: 'OPEN' | 'ACTIONED' | 'DISMISSED';
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporterName: string;
  contentPreview: string;
  contentHidden: boolean;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
}
