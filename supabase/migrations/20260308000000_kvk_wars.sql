-- KvK Wars: track individual war events within a KvK season
create table if not exists public.kvk_wars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  snapshot_before_id uuid references public.snapshots(id) on delete set null,
  snapshot_after_id uuid references public.snapshots(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.kvk_wars enable row level security;

-- Anyone authenticated can read
create policy "kvk_wars_select" on public.kvk_wars
  for select to authenticated using (true);

-- Only admins can insert/update/delete
create policy "kvk_wars_insert" on public.kvk_wars
  for insert to authenticated
  with check (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "kvk_wars_update" on public.kvk_wars
  for update to authenticated
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "kvk_wars_delete" on public.kvk_wars
  for delete to authenticated
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );
