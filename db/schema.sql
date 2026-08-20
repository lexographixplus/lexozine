-- Lexozine Studio production persistence schema
-- Designed for PostgreSQL / Neon. Safe to review before provisioning infrastructure.

create extension if not exists pgcrypto;

create type issue_status as enum ('draft', 'review', 'published');
create type page_kind as enum ('cover', 'toc', 'article');
create type block_type as enum ('headline', 'deck', 'body', 'pullquote', 'sidebar', 'image', 'caption');

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issue_number text not null,
  edition_date text not null,
  status issue_status not null default 'draft',
  description text not null default '',
  theme text not null default 'editorial',
  cover_image_url text,
  cover_lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  title text not null,
  slug text not null,
  category text not null default '',
  byline text not null default '',
  read_time text not null default '',
  layout text not null default 'feature',
  columns smallint not null default 2 check (columns between 1 and 3),
  theme text not null default 'editorial',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(issue_id, slug)
);

create table if not exists issue_pages (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  label text not null,
  kind page_kind not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  type block_type not null,
  content text not null default '',
  position integer not null default 0,
  image_url text,
  caption text,
  focal_x numeric(5,2),
  focal_y numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id) on delete cascade,
  name text not null,
  url text not null,
  mime_type text not null,
  width integer,
  height integer,
  alt_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  snapshot jsonb not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_articles_issue on articles(issue_id, position);
create index if not exists idx_pages_issue on issue_pages(issue_id, position);
create index if not exists idx_blocks_article on blocks(article_id, position);
create index if not exists idx_media_issue on media_assets(issue_id, created_at desc);
create index if not exists idx_versions_article on article_versions(article_id, created_at desc);
