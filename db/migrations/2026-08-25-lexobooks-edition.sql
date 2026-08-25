-- LexoZine Release 0.8: immutable fixed-layout edition manifest from LexoBooks.
-- Page SVG, previews and PDFs are stored in object storage; only their
-- versioned manifest belongs in Postgres.
--
-- Before deploying the accompanying owner-scoped API changes, backfill any
-- historic rows whose owner_user_id is NULL to their verified Neon user. Do
-- not use a blanket default owner in a multi-user environment.
alter table public.issues
  add column if not exists lexobooks_edition jsonb not null default '{}'::jsonb;
