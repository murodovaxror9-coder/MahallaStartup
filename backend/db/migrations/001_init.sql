-- Mahalladosh: boshlang'ich sxema (PostgreSQL 16+; PGlite ham qo'llab-quvvatlaydi).
-- Hamma vaqtlar timestamptz (UTC). ID'lar ilovada UUIDv7 bilan yaratiladi (bildirishnomalar bundan mustasno).

CREATE TABLE mahalla (
  id          uuid PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  timezone    text NOT NULL DEFAULT 'Asia/Tashkent',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                        uuid PRIMARY KEY,
  login                     text NOT NULL UNIQUE CHECK (login ~ '^[a-z0-9._]{3,32}$'),
  display_name              text NOT NULL,
  phone                     text,
  password_hash             text NOT NULL,
  must_change_password      boolean NOT NULL DEFAULT false,
  temp_password_expires_at  timestamptz,
  status                    text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
  blocked_reason            text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- MVP: bitta foydalanuvchi = bitta mahalla (UNIQUE(user_id))
CREATE TABLE memberships (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL UNIQUE REFERENCES users (id),
  mahalla_id  uuid NOT NULL REFERENCES mahalla (id),
  role        text NOT NULL CHECK (role IN ('RESIDENT', 'MAHALLA_ADMIN')),
  status      text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memberships_mahalla_role_idx ON memberships (mahalla_id, role);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users (id),
  token_hash    text NOT NULL UNIQUE,
  client        text NOT NULL CHECK (client IN ('MOBILE', 'WEB')),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE issues (
  id               uuid PRIMARY KEY,
  mahalla_id       uuid NOT NULL REFERENCES mahalla (id),
  author_id        uuid NOT NULL REFERENCES users (id),
  title            text NOT NULL,
  description      text NOT NULL,
  category         text NOT NULL CHECK (category IN ('ROAD', 'LIGHTING', 'WASTE', 'WATER', 'LANDSCAPING', 'OTHER')),
  location_text    text NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    status IN ('PENDING_REVIEW', 'OPEN', 'REJECTED', 'MERGED', 'SELECTED', 'IN_PROGRESS', 'REFERRED', 'RESOLVED')
  ),
  published_at     timestamptz,
  rejected_reason  text,
  duplicate_of_id  uuid REFERENCES issues (id),
  responsible      text,
  next_step        text,
  due_date         date,
  referred_org     text,
  referred_at      date,
  follow_up_at     date,
  resolution_text  text,
  hidden_at        timestamptz,
  hidden_reason    text,
  hidden_by_id     uuid REFERENCES users (id),
  comment_count    integer NOT NULL DEFAULT 0,
  idempotency_key  text NOT NULL,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, idempotency_key)
);
CREATE INDEX issues_feed_idx     ON issues (mahalla_id, status, published_at DESC);
CREATE INDEX issues_category_idx ON issues (mahalla_id, category);
CREATE INDEX issues_created_idx  ON issues (mahalla_id, created_at);
CREATE INDEX issues_author_idx   ON issues (author_id, created_at DESC);

CREATE TABLE issue_updates (
  id           uuid PRIMARY KEY,
  issue_id     uuid NOT NULL REFERENCES issues (id),
  actor_id     uuid REFERENCES users (id),
  type         text NOT NULL CHECK (type IN ('STATUS_CHANGE', 'DETAILS_CHANGE', 'AUTHOR_FEEDBACK', 'CARRY_OVER')),
  from_status  text,
  to_status    text,
  reason       text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issue_updates_issue_idx ON issue_updates (issue_id, created_at);

CREATE TABLE issue_follows (
  issue_id    uuid NOT NULL REFERENCES issues (id),
  user_id     uuid NOT NULL REFERENCES users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);
CREATE INDEX issue_follows_user_idx ON issue_follows (user_id);

CREATE TABLE events (
  id             uuid PRIMARY KEY,
  mahalla_id     uuid NOT NULL REFERENCES mahalla (id),
  title          text NOT NULL,
  description    text NOT NULL,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz,
  location       text NOT NULL,
  organizer      text NOT NULL,
  status         text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')),
  version        integer NOT NULL DEFAULT 1,
  result_text    text,
  rsvp_count     integer NOT NULL DEFAULT 0,
  created_by_id  uuid NOT NULL REFERENCES users (id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_mahalla_idx ON events (mahalla_id, status, starts_at);

CREATE TABLE event_rsvps (
  event_id    uuid NOT NULL REFERENCES events (id),
  user_id     uuid NOT NULL REFERENCES users (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX event_rsvps_user_idx ON event_rsvps (user_id);

CREATE TABLE media (
  id               uuid PRIMARY KEY,
  owner_id         uuid NOT NULL REFERENCES users (id),
  mahalla_id       uuid NOT NULL REFERENCES mahalla (id),
  kind             text NOT NULL CHECK (kind IN ('IMAGE', 'VIDEO')),
  storage_key      text NOT NULL,
  thumb_key        text,
  mime             text NOT NULL,
  size_bytes       integer NOT NULL,
  width            integer,
  height           integer,
  client_upload_id text NOT NULL,
  issue_id         uuid REFERENCES issues (id),
  issue_update_id  uuid REFERENCES issue_updates (id),
  event_id         uuid REFERENCES events (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, client_upload_id)
);
CREATE INDEX media_issue_idx  ON media (issue_id);
CREATE INDEX media_orphan_idx ON media (created_at)
  WHERE issue_id IS NULL AND issue_update_id IS NULL AND event_id IS NULL;

CREATE TABLE voting_rounds (
  id            uuid PRIMARY KEY,
  mahalla_id    uuid NOT NULL REFERENCES mahalla (id),
  period_start  timestamptz NOT NULL,
  period_end    timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mahalla_id, period_start)
);
CREATE INDEX voting_rounds_due_idx ON voting_rounds (status, period_end);

CREATE TABLE round_entries (
  id            uuid PRIMARY KEY,
  round_id      uuid NOT NULL REFERENCES voting_rounds (id),
  issue_id      uuid NOT NULL REFERENCES issues (id),
  vote_count    integer NOT NULL DEFAULT 0,
  added_by_id   uuid REFERENCES users (id),
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, issue_id)
);
CREATE INDEX round_entries_top_idx   ON round_entries (round_id, vote_count DESC);
CREATE INDEX round_entries_issue_idx ON round_entries (issue_id);

-- 3 ovoz limiti DB darajasida: bitta postga bitta ovoz + har ovoz beruvchiga 1..3 slot
CREATE TABLE votes (
  id          uuid PRIMARY KEY,
  round_id    uuid NOT NULL REFERENCES voting_rounds (id),
  issue_id    uuid NOT NULL REFERENCES issues (id),
  voter_id    uuid NOT NULL REFERENCES users (id),
  slot        smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, issue_id, voter_id),
  UNIQUE (round_id, voter_id, slot)
);

CREATE TABLE round_results (
  id               uuid PRIMARY KEY,
  round_id         uuid NOT NULL UNIQUE REFERENCES voting_rounds (id),
  winner_issue_id  uuid REFERENCES issues (id),
  snapshot         jsonb NOT NULL,
  total_voters     integer NOT NULL,
  total_votes      integer NOT NULL,
  closed_at        timestamptz NOT NULL,
  computed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id             uuid PRIMARY KEY,
  issue_id       uuid NOT NULL REFERENCES issues (id),
  mahalla_id     uuid NOT NULL REFERENCES mahalla (id),
  author_id      uuid NOT NULL REFERENCES users (id),
  text           text NOT NULL,
  hidden_at      timestamptz,
  hidden_reason  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_issue_idx ON comments (issue_id, created_at);

CREATE TABLE chat_messages (
  id                 uuid PRIMARY KEY,
  mahalla_id         uuid NOT NULL REFERENCES mahalla (id),
  sender_id          uuid NOT NULL REFERENCES users (id),
  text               text NOT NULL,
  client_message_id  text NOT NULL,
  hidden_at          timestamptz,
  hidden_reason      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, client_message_id)
);
CREATE INDEX chat_messages_mahalla_idx ON chat_messages (mahalla_id, id);

CREATE TABLE reports (
  id             uuid PRIMARY KEY,
  mahalla_id     uuid NOT NULL REFERENCES mahalla (id),
  reporter_id    uuid NOT NULL REFERENCES users (id),
  target_type    text NOT NULL CHECK (target_type IN ('POST', 'COMMENT', 'CHAT_MESSAGE')),
  target_id      uuid NOT NULL,
  reason         text NOT NULL,
  status         text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACTIONED', 'DISMISSED')),
  resolved_by_id uuid REFERENCES users (id),
  resolution     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz,
  UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX reports_mahalla_idx ON reports (mahalla_id, status);

CREATE TABLE audit_events (
  id           uuid PRIMARY KEY,
  mahalla_id   uuid REFERENCES mahalla (id),
  actor_id     uuid REFERENCES users (id),
  action       text NOT NULL,
  target_type  text NOT NULL,
  target_id    text,
  reason       text,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_mahalla_idx ON audit_events (mahalla_id, created_at DESC);

CREATE TABLE announcements (
  id               uuid PRIMARY KEY,
  mahalla_id       uuid NOT NULL REFERENCES mahalla (id),
  title            text NOT NULL,
  body             text NOT NULL,
  is_important     boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  published_at     timestamptz,
  fanout_done_at   timestamptz,
  created_by_id    uuid NOT NULL REFERENCES users (id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcements_mahalla_idx ON announcements (mahalla_id, status, published_at DESC);

CREATE TABLE notifications (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users (id),
  mahalla_id   uuid NOT NULL REFERENCES mahalla (id),
  type         text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  dedupe_key   text NOT NULL,
  read_at      timestamptz,
  pushed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX notifications_user_idx   ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX notifications_push_idx   ON notifications (created_at) WHERE pushed_at IS NULL;

CREATE TABLE device_tokens (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users (id),
  expo_push_token  text NOT NULL UNIQUE,
  platform         text NOT NULL CHECK (platform IN ('ios', 'android')),
  last_seen_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);
