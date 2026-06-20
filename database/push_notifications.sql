-- Camotes Runner Phase 7A: Push notification tokens and logs.
-- Run this after database/schema.sql and database/authentication.sql.

alter table public.profiles
add column if not exists push_token text;

alter table public.riders
add column if not exists push_token text;

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null,
  recipient_id uuid,
  push_token text,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  constraint notification_logs_recipient_type_check check (
    recipient_type in ('customer', 'rider', 'admin', 'unknown')
  ),
  constraint notification_logs_status_check check (
    status in ('queued', 'sent', 'failed', 'skipped')
  )
);

create index if not exists notification_logs_recipient_id_idx
on public.notification_logs(recipient_id);

alter table public.notification_logs enable row level security;

drop policy if exists "MVP can view notification logs" on public.notification_logs;
create policy "MVP can view notification logs"
on public.notification_logs
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create notification logs" on public.notification_logs;
create policy "MVP can create notification logs"
on public.notification_logs
for insert
to anon, authenticated
with check (true);
