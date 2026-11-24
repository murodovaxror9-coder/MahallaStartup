// backend/src/modules/**/routes.ts, dto.ts, service.ts dagi javob shakllariga mos.

export interface MediaItem {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  mime: string;
  sizeBytes: number;
  expiresAt: string;
}

export interface DuplicateOf {
  id: string;
  title: string;
}

export interface IssueListItem {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  locationText: string;
  status: string;
  statusLabel: string;
  publishedAt: string | null;
  createdAt: string;
  commentCount: number;
  voteCount: number | null;
  myVote: boolean;
  isFollowing: boolean;
  thumbUrl: string | null;
  authorName: string;
  responsible: string | null;
  dueDate: string | null;
  hidden: boolean;
  rejectedReason: string | null;
  duplicateOf: DuplicateOf | null;
}

export interface IssueHistoryItem {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  actorName: string | null;
  media: MediaItem[];
}

export interface IssueDetail {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  hidden: boolean;
  hiddenNotice?: string;
  author: { id: string; displayName: string };
  createdAt: string;
  publishedAt: string | null;
  description?: string;
  locationText?: string;
  media?: MediaItem[];
  voteCount?: number | null;
  roundId?: string | null;
  myVote?: boolean;
  isFollowing?: boolean;
  canVote?: boolean;
  commentCount?: number;
  duplicateOf?: DuplicateOf | null;
  rejectedReason?: string | null;
  responsible?: string | null;
  nextStep?: string | null;
  dueDate?: string | null;
  referredOrg?: string | null;
  referredAt?: string | null;
  followUpAt?: string | null;
  resolutionText?: string | null;
  hiddenReason?: string | null;
  history?: IssueHistoryItem[];
}

export interface CommentItem {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  hidden?: boolean;
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
  myRsvp: boolean;
  createdAt: string;
  media?: MediaItem[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface RoundWinner {
  issueId: string;
  title: string;
  votes: number;
}

export interface RoundSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'OPEN' | 'CLOSED';
  winner: RoundWinner | null;
  totalVoters: number | null;
  totalVotes: number | null;
}

export interface RankedIssue {
  issueId: string;
  title: string;
  votes: number;
  rank: number;
}

export interface RoundResult {
  roundId: string;
  periodStart: string;
  periodEnd: string;
  closedAt: string;
  winner: RankedIssue | null;
  ranking: RankedIssue[];
  totalVoters: number;
  totalVotes: number;
  message: string;
}

export interface HomeData {
  round: { periodEnd: string; votesLeft: number };
  featuredIssue: { id: string; title: string; status: string; statusLabel: string } | null;
  nextEvent: { id: string; title: string; startsAt: string; location: string } | null;
  latestImportantAnnouncement: { id: string; title: string; publishedAt: string | null } | null;
  unreadNotifications: number;
}

export interface CurrentRoundData {
  round: { id: string; status: string; periodStart: string; periodEnd: string };
  periodStart: string;
  periodEnd: string;
  votesUsed: number;
  votesLeft: number;
  myVotes: { issueId: string; title: string; slot: number }[];
}

export interface MeData {
  user: {
    id: string;
    login: string;
    displayName: string;
    phone: string | null;
    role: string;
    mahalla: { id: string; name: string; slug: string };
  };
  mahalla: { id: string; name: string; slug: string };
  role: string;
  mustChangePassword: boolean;
  unreadNotifications: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
