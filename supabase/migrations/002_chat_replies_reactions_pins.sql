-- Chat: replies, reactions, pinned messages.
-- Run once in Supabase → SQL Editor. Safe to run again.

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
