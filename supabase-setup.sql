-- Kerkbode: privé gedeelde bezorglijst.
-- Alleen ingelogde gebruikers mogen de adressen lezen en bezorgstatus bijwerken.
-- Alleen user_id's in public.managers mogen adressen beheren.

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

create table if not exists public.managers (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.addresses enable row level security;
alter table public.delivery_status enable row level security;
alter table public.managers enable row level security;

grant usage on schema public to authenticated;
revoke all on table public.addresses, public.delivery_status, public.managers from anon, authenticated;
grant select on table public.addresses, public.delivery_status to authenticated;
grant insert, update on table public.delivery_status to authenticated;
grant select on table public.managers to authenticated;
grant insert, update, delete on table public.addresses to authenticated;

create or replace function public.is_kerkbode_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.managers where user_id = auth.uid());
$$;
revoke all on function public.is_kerkbode_manager() from public, anon;
grant execute on function public.is_kerkbode_manager() to authenticated;

drop policy if exists "Authenticated users read addresses" on public.addresses;
drop policy if exists "Anyone can read addresses" on public.addresses;
drop policy if exists "Signed-in manager can add addresses" on public.addresses;
drop policy if exists "Signed-in manager can edit addresses" on public.addresses;
drop policy if exists "Signed-in manager can remove addresses" on public.addresses;
create policy "Authenticated users read addresses"
  on public.addresses for select to authenticated using (true);
drop policy if exists "Managers add addresses" on public.addresses;
create policy "Managers add addresses"
  on public.addresses for insert to authenticated with check (public.is_kerkbode_manager());
drop policy if exists "Managers edit addresses" on public.addresses;
create policy "Managers edit addresses"
  on public.addresses for update to authenticated using (public.is_kerkbode_manager()) with check (public.is_kerkbode_manager());
drop policy if exists "Managers remove addresses" on public.addresses;
create policy "Managers remove addresses"
  on public.addresses for delete to authenticated using (public.is_kerkbode_manager());

drop policy if exists "Authenticated users read delivery status" on public.delivery_status;
drop policy if exists "Anyone can read delivery status" on public.delivery_status;
drop policy if exists "Anyone can mark deliveries" on public.delivery_status;
drop policy if exists "Anyone can update delivery status" on public.delivery_status;
create policy "Authenticated users read delivery status"
  on public.delivery_status for select to authenticated using (true);
drop policy if exists "Authenticated users mark deliveries" on public.delivery_status;
create policy "Authenticated users mark deliveries"
  on public.delivery_status for insert to authenticated with check (true);
drop policy if exists "Authenticated users update delivery status" on public.delivery_status;
create policy "Authenticated users update delivery status"
  on public.delivery_status for update to authenticated using (true) with check (true);

drop policy if exists "Managers can see own role" on public.managers;
create policy "Managers can see own role"
  on public.managers for select to authenticated using (user_id = auth.uid());

create index if not exists addresses_wijk_sort_order_idx
  on public.addresses (wijk, sort_order);
