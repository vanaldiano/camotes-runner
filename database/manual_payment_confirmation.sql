-- Camotes Runner Phase 9A: Manual GCash payment confirmation.
-- Safe to run more than once. Adds manual payment review fields before PayMongo automation.

create extension if not exists pgcrypto;

alter table public.partner_orders add column if not exists payment_status text not null default 'pending_payment';
alter table public.partner_orders add column if not exists payment_method text;
alter table public.partner_orders add column if not exists payment_reference text;
alter table public.partner_orders add column if not exists payment_proof_url text;
alter table public.partner_orders add column if not exists payment_proof_path text;
alter table public.partner_orders add column if not exists payment_submitted_at timestamptz;
alter table public.partner_orders add column if not exists payment_confirmed_at timestamptz;
alter table public.partner_orders add column if not exists payment_confirmed_by uuid;
alter table public.partner_orders add column if not exists payment_notes text;

alter table public.food_orders add column if not exists payment_status text not null default 'pending_payment';
alter table public.food_orders add column if not exists payment_method text;
alter table public.food_orders add column if not exists payment_reference text;
alter table public.food_orders add column if not exists payment_proof_url text;
alter table public.food_orders add column if not exists payment_proof_path text;
alter table public.food_orders add column if not exists payment_submitted_at timestamptz;
alter table public.food_orders add column if not exists payment_confirmed_at timestamptz;
alter table public.food_orders add column if not exists payment_confirmed_by uuid;
alter table public.food_orders add column if not exists payment_notes text;

update public.partner_orders
set payment_status = case
  when lower(coalesce(payment_method, '')) in ('cash', 'cash_on_delivery', 'cod') then 'cash_on_delivery'
  when payment_status is null then 'pending_payment'
  else payment_status
end
where payment_status is null
   or lower(coalesce(payment_method, '')) in ('cash', 'cash_on_delivery', 'cod');

update public.food_orders
set payment_status = case
  when lower(coalesce(payment_method, '')) in ('cash', 'cash_on_delivery', 'cod') then 'cash_on_delivery'
  when payment_status is null then 'pending_payment'
  else payment_status
end
where payment_status is null
   or lower(coalesce(payment_method, '')) in ('cash', 'cash_on_delivery', 'cod');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_orders_payment_status_check'
  ) then
    alter table public.partner_orders
    add constraint partner_orders_payment_status_check
    check (payment_status in (
      'pending_payment',
      'payment_submitted',
      'paid',
      'rejected',
      'refunded',
      'cash_on_delivery'
    ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'food_orders_payment_status_check'
  ) then
    alter table public.food_orders
    add constraint food_orders_payment_status_check
    check (payment_status in (
      'pending_payment',
      'payment_submitted',
      'paid',
      'rejected',
      'refunded',
      'cash_on_delivery'
    ));
  end if;
end $$;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_type text not null,
  order_id uuid not null,
  payment_method text not null,
  amount numeric not null,
  reference_number text,
  proof_url text,
  proof_path text,
  status text not null default 'payment_submitted',
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_payments_order_type_check'
  ) then
    alter table public.order_payments
    add constraint order_payments_order_type_check
    check (order_type in ('partner_order', 'food_order'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_payments_status_check'
  ) then
    alter table public.order_payments
    add constraint order_payments_status_check
    check (status in (
      'pending_payment',
      'payment_submitted',
      'paid',
      'rejected',
      'refunded',
      'cash_on_delivery'
    ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_payments_amount_nonnegative_check'
  ) then
    alter table public.order_payments
    add constraint order_payments_amount_nonnegative_check
    check (amount >= 0);
  end if;
end $$;

create index if not exists partner_orders_payment_status_idx
on public.partner_orders(payment_status, created_at desc);

create index if not exists food_orders_payment_status_idx
on public.food_orders(payment_status, created_at desc);

create index if not exists order_payments_order_idx
on public.order_payments(order_type, order_id, created_at desc);

create index if not exists order_payments_status_idx
on public.order_payments(status, submitted_at desc);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers can upload payment proofs" on storage.objects;
create policy "Customers can upload payment proofs"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'payment-proofs');

drop policy if exists "Customers and admins can read payment proofs" on storage.objects;
create policy "Customers and admins can read payment proofs"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'payment-proofs');

-- Phase 9A app support records GCash reference numbers first.
-- payment_proof_url/payment_proof_path and the payment-proofs bucket are ready for screenshot upload.
