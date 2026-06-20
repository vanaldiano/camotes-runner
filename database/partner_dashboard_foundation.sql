-- Camotes Runner Phase 8B: Partner Website Dashboard Foundation
-- Safe to run more than once. Adds partner dashboard support without deleting or overwriting existing app data.

create extension if not exists pgcrypto;

alter table public.business_partners add column if not exists owner_name text;
alter table public.business_partners add column if not exists owner_email text;
alter table public.business_partners add column if not exists owner_phone text;
alter table public.business_partners add column if not exists business_hours text;
alter table public.business_partners add column if not exists status text not null default 'active';
alter table public.business_partners add column if not exists partner_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_partners_status_check'
  ) then
    alter table public.business_partners
    add constraint business_partners_status_check
    check (status in ('active', 'pending', 'paused', 'suspended'));
  end if;
end $$;

create table if not exists public.partner_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  partner_id uuid not null references public.business_partners(id) on delete cascade,
  role text not null default 'owner',
  full_name text,
  email text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, partner_id)
);

alter table public.partner_users add column if not exists user_id uuid;
alter table public.partner_users add column if not exists partner_id uuid;
alter table public.partner_users add column if not exists role text not null default 'owner';
alter table public.partner_users add column if not exists full_name text;
alter table public.partner_users add column if not exists email text;
alter table public.partner_users add column if not exists phone text;
alter table public.partner_users add column if not exists is_active boolean not null default true;
alter table public.partner_users add column if not exists created_at timestamptz not null default now();
alter table public.partner_users add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_user_id_partner_id_key'
  ) then
    alter table public.partner_users
    add constraint partner_users_user_id_partner_id_key unique (user_id, partner_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_user_id_fkey'
  ) then
    alter table public.partner_users
    add constraint partner_users_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_partner_id_fkey'
  ) then
    alter table public.partner_users
    add constraint partner_users_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_role_check'
  ) then
    alter table public.partner_users
    add constraint partner_users_role_check
    check (role in ('owner', 'manager', 'staff'));
  end if;
end $$;

create index if not exists partner_users_user_id_idx
on public.partner_users(user_id);

create index if not exists partner_users_partner_id_idx
on public.partner_users(partner_id);

create index if not exists business_partners_status_active_idx
on public.business_partners(status, is_active, is_open);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

create or replace function public.is_partner_user(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_users
    where partner_id = target_partner_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

alter table public.business_partners enable row level security;
alter table public.partner_users enable row level security;

drop policy if exists "Customers can view active business partners" on public.business_partners;
create policy "Customers can view active business partners"
on public.business_partners
for select
to anon, authenticated
using (is_active = true and status = 'active');

drop policy if exists "Admins can manage business partners" on public.business_partners;
create policy "Admins can manage business partners"
on public.business_partners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can view own business partner" on public.business_partners;
create policy "Partner users can view own business partner"
on public.business_partners
for select
to authenticated
using (public.is_partner_user(id));

drop policy if exists "Partner users can update own business partner" on public.business_partners;
create policy "Partner users can update own business partner"
on public.business_partners
for update
to authenticated
using (public.is_partner_user(id))
with check (public.is_partner_user(id));

drop policy if exists "Admins can manage partner users" on public.partner_users;
create policy "Admins can manage partner users"
on public.partner_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can view own partner user links" on public.partner_users;
create policy "Partner users can view own partner user links"
on public.partner_users
for select
to authenticated
using (user_id = auth.uid() and is_active = true);

-- Notes:
-- Partner auth routing and stricter field-level controls should be finalized in Phase 8D.
-- This migration intentionally does not delete, rewrite, or backfill existing partner/shop/order data.
