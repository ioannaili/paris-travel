create table if not exists public.activity_selections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

alter table public.activity_selections enable row level security;

drop policy if exists "authenticated users can read activity selections" on public.activity_selections;
create policy "authenticated users can read activity selections"
  on public.activity_selections
  for select
  to authenticated
  using (true);

drop policy if exists "users can insert own activity selections" on public.activity_selections;
create policy "users can insert own activity selections"
  on public.activity_selections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update own activity selections" on public.activity_selections;
create policy "users can update own activity selections"
  on public.activity_selections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
