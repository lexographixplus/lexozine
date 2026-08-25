-- LexoZine Release 0.8: immutable fixed-layout edition manifest from LexoBooks.
-- Page SVG, previews and PDFs are stored in object storage; only their
-- versioned manifest belongs in Postgres.
alter table public.issues
  add column if not exists lexobooks_edition jsonb not null default '{}'::jsonb;
