-- Lexozine Release 0.4: durable cover state and public reader metadata
alter table public.issues add column if not exists cover jsonb not null default '{}'::jsonb;
alter table public.issues add column if not exists palette jsonb not null default '{}'::jsonb;
alter table public.issues add column if not exists public_slug text;
alter table public.issues add column if not exists visibility text not null default 'private';
alter table public.issues add column if not exists published_at timestamptz;

create unique index if not exists issues_public_slug_unique
  on public.issues(public_slug)
  where public_slug is not null;

alter table public.issues drop constraint if exists issues_visibility_check;
alter table public.issues add constraint issues_visibility_check
  check (visibility in ('public', 'unlisted', 'private')) not valid;
alter table public.issues validate constraint issues_visibility_check;
