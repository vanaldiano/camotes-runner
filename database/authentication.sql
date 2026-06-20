-- Camotes Runner Phase 6B: Supabase Auth setup.
-- Run this after database/schema.sql.
-- Guest-mode MVP policies can stay in place during the transition.

alter table public.profiles
add column if not exists role text not null default 'customer';

alter table public.profiles
add column if not exists push_token text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
    add constraint profiles_role_check
    check (role in ('customer', 'rider', 'admin'));
  end if;
end $$;

alter table public.riders
add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

alter table public.riders
add column if not exists push_token text;

create index if not exists riders_auth_user_id_idx
on public.riders(auth_user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Camotes Runner Customer'),
    new.raw_user_meta_data ->> 'phone',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Riders can view linked rider profile" on public.riders;
create policy "Riders can view linked rider profile"
on public.riders
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Riders can update linked rider profile" on public.riders;
create policy "Riders can update linked rider profile"
on public.riders
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());
