-- Kerbode shared database
-- Run this once in the Supabase SQL Editor.

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  wijk text not null check (wijk in ('wijk1', 'wijk2')),
  name text not null,
  address text not null,
  comment text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_status (
  address_id uuid primary key references public.addresses(id) on delete cascade,
  delivered boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;
alter table public.delivery_status enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on table public.addresses from anon, authenticated;
revoke all on table public.delivery_status from anon, authenticated;
grant select on table public.addresses to anon, authenticated;
grant insert, update, delete on table public.addresses to authenticated;
grant select, insert, update on table public.delivery_status to anon, authenticated;

drop policy if exists "Anyone can read addresses" on public.addresses;
create policy "Anyone can read addresses"
  on public.addresses for select to anon, authenticated using (true);

drop policy if exists "Signed-in manager can add addresses" on public.addresses;
create policy "Signed-in manager can add addresses"
  on public.addresses for insert to authenticated with check (true);

drop policy if exists "Signed-in manager can edit addresses" on public.addresses;
create policy "Signed-in manager can edit addresses"
  on public.addresses for update to authenticated using (true) with check (true);

drop policy if exists "Signed-in manager can remove addresses" on public.addresses;
create policy "Signed-in manager can remove addresses"
  on public.addresses for delete to authenticated using (true);

drop policy if exists "Anyone can read delivery status" on public.delivery_status;
create policy "Anyone can read delivery status"
  on public.delivery_status for select to anon, authenticated using (true);

drop policy if exists "Anyone can mark deliveries" on public.delivery_status;
create policy "Anyone can mark deliveries"
  on public.delivery_status for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can update delivery status" on public.delivery_status;
create policy "Anyone can update delivery status"
  on public.delivery_status for update to anon, authenticated using (true) with check (true);

create index if not exists addresses_wijk_sort_order_idx
  on public.addresses (wijk, sort_order);
