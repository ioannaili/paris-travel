alter table public.activities
  add column if not exists voting_phase boolean not null default false;
