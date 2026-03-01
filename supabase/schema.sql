create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  area text,
  type text,
  duration integer,
  price text,
  booking_required boolean not null default false,
  booking_link text,
  google_maps_link text,
  source_type text,
  reddit_link text,
  popularity integer not null default 1,
  created_at timestamptz not null default now()
);

create type public.vote_value as enum ('yes', 'maybe', 'no');

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  vote public.vote_value not null,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  day integer not null check (day between 1 and 5),
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.activities enable row level security;
alter table public.votes enable row level security;
alter table public.programs enable row level security;

create policy "authenticated users can read users"
  on public.users
  for select
  to authenticated
  using (true);

create policy "authenticated users can read activities"
  on public.activities
  for select
  to authenticated
  using (true);

create policy "authenticated users can create activities"
  on public.activities
  for insert
  to authenticated
  with check (true);

create policy "authenticated users can update activities"
  on public.activities
  for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can read votes"
  on public.votes
  for select
  to authenticated
  using (true);

create policy "users can insert own votes"
  on public.votes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own votes"
  on public.votes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "authenticated users can read programs"
  on public.programs
  for select
  to authenticated
  using (true);

create policy "authenticated users can create programs"
  on public.programs
  for insert
  to authenticated
  with check (true);

alter table public.activities
  add column if not exists created_by_user_id uuid references public.users (id) on delete set null,
  add column if not exists source_name text,
  add column if not exists notes text,
  add column if not exists voting_phase boolean not null default false,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists tiktok_link text,
  add column if not exists last_updated timestamptz not null default now();

create table if not exists public.activity_selections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

alter table public.activity_selections enable row level security;

create policy "authenticated users can read activity selections"
  on public.activity_selections
  for select
  to authenticated
  using (true);

create policy "users can insert own activity selections"
  on public.activity_selections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own activity selections"
  on public.activity_selections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'activities_source_type_allowed'
  ) then
    alter table public.activities
      add constraint activities_source_type_allowed
      check (source_type is null or source_type in ('manual', 'reddit', 'google', 'ai', 'tiktok'));
  end if;
end;
$$;

alter table public.activities
  drop constraint if exists activities_source_type_allowed;

alter table public.activities
  add constraint activities_source_type_allowed
  check (source_type is null or source_type in ('manual', 'reddit', 'google', 'ai', 'tiktok'));

create or replace function public.set_activity_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists trg_activities_last_updated on public.activities;
create trigger trg_activities_last_updated
before update on public.activities
for each row
execute function public.set_activity_last_updated();

create or replace function public.vote_points(v public.vote_value)
returns integer
language sql
immutable
as $$
  select case
    when v = 'yes' then 2
    when v = 'maybe' then 1
    else 0
  end;
$$;

create or replace function public.apply_vote_popularity_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.activities
    set popularity = coalesce(popularity, 0) + public.vote_points(new.vote),
        last_updated = now()
    where id = new.activity_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.activities
    set popularity = greatest(
          0,
          coalesce(popularity, 0)
          - public.vote_points(old.vote)
          + public.vote_points(new.vote)
        ),
        last_updated = now()
    where id = new.activity_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.activities
    set popularity = greatest(0, coalesce(popularity, 0) - public.vote_points(old.vote)),
        last_updated = now()
    where id = old.activity_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_votes_popularity_delta on public.votes;
create trigger trg_votes_popularity_delta
after insert or update or delete on public.votes
for each row
execute function public.apply_vote_popularity_delta();

alter table public.programs
  add column if not exists created_by_user_id uuid references public.users (id) on delete set null,
  add column if not exists program_json jsonb,
  add column if not exists program_type text;

update public.programs
set program_type = coalesce(program_type, 'general')
where program_type is null;

update public.programs
set program_json = coalesce(
  program_json,
  jsonb_build_object(
    'days',
    jsonb_build_array(
      jsonb_build_object(
        'day',
        day,
        'items',
        coalesce(content, '[]'::jsonb)
      )
    )
  )
)
where program_json is null;

alter table public.programs
  alter column program_json set not null,
  alter column program_type set not null,
  alter column program_type set default 'general';

alter table public.programs
  drop constraint if exists programs_program_type_allowed;

alter table public.programs
  add constraint programs_program_type_allowed
  check (program_type in ('general', 'user_based'));

alter table public.programs
  alter column day drop not null,
  alter column content drop not null;
