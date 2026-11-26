-- IVP Pickleball 2026 — Supabase schema
-- Run once in Supabase → SQL Editor, then run seed.sql.
-- Model: the public (anon key) can only READ. Every write goes through
-- Next.js API routes that check the edit-code cookie and use the service role key.

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

-- Tournament controls (the "Inputs_Rules" sheet) + misc site text.
create table if not exists settings (
  key         text primary key,
  label       text not null,
  value       text,
  notes       text,
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,           -- T01..T10 (fixed draw order for Round 1)
  name        text not null,
  captain     text,
  color       text,                           -- optional accent for charts
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  gender      text check (gender in ('M', 'F')),
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create index if not exists players_team_idx on players(team_id);

-- One row per tie (Swiss T01–T15 + playoffs Q1/EL/Q2/GF).
-- A tie = 3 parallel sets on Courts 1–3; best of 3 sets wins.
create table if not exists matches (
  id          text primary key,               -- 'SW-R1-T01', 'PL-Q1', ...
  stage       text not null check (stage in ('swiss', 'playoff')),
  round       int,                            -- 1..3 for swiss, null for playoffs
  label       text not null,                  -- 'Round 1', 'Qualifier 1 (1st vs 2nd)'
  wave        text,
  start_time  text,                           -- display text, e.g. '03:30 PM' (editable)
  end_time    text,
  race_to     int  not null default 15,
  cap         int  not null default 17,
  team_a_id   uuid references teams(id) on delete set null,
  team_b_id   uuid references teams(id) on delete set null,
  -- Where an empty slot gets its team from: 'standing:1', 'winner:PL-Q1', 'loser:PL-Q1'.
  a_source    text,
  b_source    text,
  pairing_locked boolean not null default false, -- true once auto-paired or manually overridden
  c1_a int, c1_b int,
  c2_a int, c2_b int,
  c3_a int, c3_b int,
  -- Per-court lineups: {"c1": {"a": [playerId, playerId], "b": [...]}, "c2": ..., "c3": ...}
  lineups     jsonb not null default '{}'::jsonb,
  court_officials jsonb not null default '{}'::jsonb, -- {"c1": "name", "c2": "...", "c3": "..."}
  is_live     boolean not null default false,  -- editor flags "on court now"
  notes       text,
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Master schedule (the "Schedule" sheet). Rows with match_id link to a tie;
-- rows without (BREAK, BUFFER, END) use `title`.
create table if not exists schedule_items (
  id          uuid primary key default gen_random_uuid(),
  wave        text,
  start_time  text,
  end_time    text,
  mins        int,
  phase       text,
  match_id    text references matches(id) on delete set null,
  title       text,
  format      text,
  warmup      text,
  officials   text,
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists rules (
  id          uuid primary key default gen_random_uuid(),
  code        text,
  category    text,
  topic       text,
  ruling      text,
  sort        int  not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists chat_messages (
  id          bigint generated always as identity primary key,
  author      text not null check (char_length(author) between 1 and 40),
  body        text not null check (char_length(body) between 1 and 500),
  is_editor   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists chat_created_idx on chat_messages(created_at desc);

-- Live feed: written by the server on score changes, pairings, results.
create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  kind        text not null,                  -- 'score' | 'result' | 'pairing' | 'edit' | 'announcement'
  match_id    text references matches(id) on delete set null,
  message     text not null,
  actor       text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_created_idx on activity_log(created_at desc);

-- ───────────────────── updated_at trigger ─────────────────────

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['settings','teams','players','matches','schedule_items','rules'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ───────────────────── Row Level Security ─────────────────────
-- Anyone may read. No anon/authenticated writes at all — the service role
-- (used only inside Next.js API routes) bypasses RLS.

do $$
declare t text;
begin
  foreach t in array array['settings','teams','players','matches','schedule_items','rules','chat_messages','activity_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_public_read on %I', t, t);
    execute format('create policy %I_public_read on %I for select using (true)', t, t);
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────
-- Viewers subscribe to these tables, so the page updates without reloads.

do $$
declare t text;
begin
  foreach t in array array['settings','teams','players','matches','schedule_items','rules','chat_messages','activity_log'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- Send full old rows on UPDATE/DELETE so clients can patch state precisely.
alter table matches        replica identity full;
alter table teams          replica identity full;
alter table players        replica identity full;
alter table schedule_items replica identity full;
alter table rules          replica identity full;
alter table settings       replica identity full;

-- ───────────────── Chat replies / reactions / pins ─────────────────

-- Replies keep a small snapshot of the original, so the quote still shows
-- even if the original is old (not loaded) or deleted.
alter table chat_messages add column if not exists reply_to     bigint references chat_messages(id) on delete set null;
alter table chat_messages add column if not exists reply_author text;
alter table chat_messages add column if not exists reply_body   text;

-- Pins (organisers only, max 2 — enforced by the API).
alter table chat_messages add column if not exists pinned_at timestamptz;
alter table chat_messages add column if not exists pinned_by text;
create index if not exists chat_pinned_idx on chat_messages(pinned_at) where pinned_at is not null;

-- Reactions: one per person per message (like WhatsApp; picking another
-- emoji replaces it). id = "<message_id>:<reactor>", reactor = a hash of a
-- random per-device cookie, so nobody can react as someone else.
create table if not exists chat_reactions (
  id          text primary key,
  message_id  bigint not null references chat_messages(id) on delete cascade,
  reactor     text not null,
  emoji       text not null check (emoji in ('like', 'dislike', 'heart', 'laugh', 'cry')),
  created_at  timestamptz not null default now(),
  unique (message_id, reactor)
);
create index if not exists chat_reactions_msg_idx on chat_reactions(message_id);

alter table chat_reactions enable row level security;
drop policy if exists chat_reactions_public_read on chat_reactions;
create policy chat_reactions_public_read on chat_reactions for select using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reactions'
  ) then
    alter publication supabase_realtime add table chat_reactions;
  end if;
end $$;

alter table chat_reactions replica identity full;
alter table chat_messages  replica identity full;
