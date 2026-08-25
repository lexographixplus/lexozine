import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Article, Issue, IssuePage, StoryBlock } from "@/lib/editor-model";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid = (value?: string) => value && UUID_RE.test(value) ? value : randomUUID();

export function normalizeIssueIds(input: Issue): Issue {
  const issueId = uuid(input.id);
  const articleIds = new Map<string, string>();
  const articles = input.articles.map((article) => {
    const id = uuid(article.id);
    articleIds.set(article.id, id);
    return {
      ...article,
      id,
      blocks: article.blocks.map((block) => ({ ...block, id: uuid(block.id) })),
    };
  });
  const pages = input.pages.map((page) => ({
    ...page,
    id: uuid(page.id),
    articleId: page.articleId ? articleIds.get(page.articleId) ?? uuid(page.articleId) : undefined,
  }));
  return { ...input, id: issueId, articles, pages };
}

export async function listIssues(ownerUserId?: string): Promise<Issue[]> {
  const sql = db();
  const issueQuery = ownerUserId
    ? sql`select * from issues where owner_user_id=${ownerUserId} order by updated_at desc`
    : sql`select * from issues order by updated_at desc`;
  const [issues, articles, pages, blocks] = await sql.transaction([
    issueQuery,
    sql`select * from articles order by issue_id, position`,
    sql`select * from issue_pages order by issue_id, position`,
    sql`select b.* from blocks b join articles a on a.id=b.article_id order by a.issue_id, a.position, b.position`,
  ], { readOnly: true });

  const blockMap = new Map<string, StoryBlock[]>();
  for (const row of blocks as any[]) {
    const rawPlacement = row.placement && typeof row.placement === "object" ? row.placement : {};
    const { __frame, __layout, ...imagePlacement } = rawPlacement as Record<string, unknown>;
    const item: StoryBlock = {
      id: row.id,
      type: row.type,
      content: row.content,
      order: row.position,
      imageUrl: row.image_url ?? undefined,
      imagePublicId: row.image_public_id ?? undefined,
      caption: row.caption ?? undefined,
      placement: Object.keys(imagePlacement).length ? imagePlacement as StoryBlock["placement"] : undefined,
      frame: __frame && typeof __frame === "object" ? __frame as StoryBlock["frame"] : undefined,
      layout: __layout && typeof __layout === "object" ? __layout as StoryBlock["layout"] : undefined,
    };
    const current = blockMap.get(row.article_id) ?? [];
    current.push(item);
    blockMap.set(row.article_id, current);
  }

  const articleMap = new Map<string, Article[]>();
  for (const row of articles as any[]) {
    const item: Article = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category,
      byline: row.byline,
      readTime: row.read_time,
      layout: row.layout,
      columns: row.columns,
      theme: row.theme,
      blocks: blockMap.get(row.id) ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
    const current = articleMap.get(row.issue_id) ?? [];
    current.push(item);
    articleMap.set(row.issue_id, current);
  }

  const pageMap = new Map<string, IssuePage[]>();
  for (const row of pages as any[]) {
    const item: IssuePage = { id: row.id, label: row.label, kind: row.kind, articleId: row.article_id ?? undefined, order: row.position };
    const current = pageMap.get(row.issue_id) ?? [];
    current.push(item);
    pageMap.set(row.issue_id, current);
  }

  return (issues as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    number: row.issue_number,
    editionDate: row.edition_date,
    status: row.status,
    description: row.description,
    theme: row.theme,
    coverImageUrl: row.cover_image_url ?? undefined,
    coverImagePublicId: row.cover_image_public_id ?? undefined,
    coverLines: row.cover_lines ?? [],
    cover: row.cover && Object.keys(row.cover).length ? row.cover : undefined,
    palette: row.palette && Object.keys(row.palette).length ? row.palette : undefined,
    publicSlug: row.public_slug ?? undefined,
    visibility: row.visibility ?? "private",
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    production: row.production && Object.keys(row.production).length ? row.production : undefined,
    typography: row.typography && Object.keys(row.typography).length ? row.typography : undefined,
    fixedLayout: row.lexobooks_edition && Object.keys(row.lexobooks_edition).length ? row.lexobooks_edition : undefined,
    pages: pageMap.get(row.id) ?? [],
    articles: articleMap.get(row.id) ?? [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  })) as Issue[];
}

export async function getIssue(id: string, ownerUserId?: string): Promise<Issue | null> {
  const issues = await listIssues(ownerUserId);
  return issues.find((issue) => issue.id === id) ?? null;
}

export async function getPublicIssueBySlug(slug: string): Promise<Issue | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const issues = await listIssues();
  return issues.find((issue) =>
    issue.status === "published" &&
    issue.publicSlug?.toLowerCase() === normalized &&
    (issue.visibility === "public" || issue.visibility === "unlisted")
  ) ?? null;
}

export async function saveIssue(input: Issue, ownerUserId?: string): Promise<Issue> {
  const issue = normalizeIssueIds({ ...input, updatedAt: new Date().toISOString() });
  const sql = db();
  const queries: any[] = [];

  queries.push(sql`
    insert into issues (id, owner_user_id, title, issue_number, edition_date, status, description, theme, cover_image_url, cover_image_public_id, cover_lines, cover, palette, public_slug, visibility, published_at, production, typography, lexobooks_edition, created_at, updated_at)
    values (${issue.id}::uuid, ${ownerUserId ?? null}, ${issue.title}, ${issue.number}, ${issue.editionDate}, ${issue.status}::issue_status, ${issue.description}, ${issue.theme}, ${issue.coverImageUrl ?? null}, ${issue.coverImagePublicId ?? null}, ${JSON.stringify(issue.coverLines)}::jsonb, ${JSON.stringify(issue.cover ?? {})}::jsonb, ${JSON.stringify(issue.palette ?? {})}::jsonb, ${issue.publicSlug ?? null}, ${issue.visibility ?? "private"}, ${issue.publishedAt ?? null}::timestamptz, ${JSON.stringify(issue.production ?? {})}::jsonb, ${JSON.stringify(issue.typography ?? {})}::jsonb, ${JSON.stringify(issue.fixedLayout ?? {})}::jsonb, ${issue.createdAt}::timestamptz, ${issue.updatedAt}::timestamptz)
    on conflict (id) do update set owner_user_id=coalesce(issues.owner_user_id, excluded.owner_user_id), title=excluded.title, issue_number=excluded.issue_number, edition_date=excluded.edition_date, status=excluded.status, description=excluded.description, theme=excluded.theme, cover_image_url=excluded.cover_image_url, cover_image_public_id=excluded.cover_image_public_id, cover_lines=excluded.cover_lines, cover=excluded.cover, palette=excluded.palette, public_slug=excluded.public_slug, visibility=excluded.visibility, published_at=excluded.published_at, production=excluded.production, typography=excluded.typography, lexobooks_edition=excluded.lexobooks_edition, updated_at=excluded.updated_at
  `);

  queries.push(sql`delete from issue_pages where issue_id=${issue.id}::uuid`);

  for (const article of issue.articles) {
    queries.push(sql`
      insert into articles (id, issue_id, title, slug, category, byline, read_time, layout, columns, theme, position, created_at, updated_at)
      values (${article.id}::uuid, ${issue.id}::uuid, ${article.title}, ${article.slug}, ${article.category}, ${article.byline}, ${article.readTime}, ${article.layout}, ${article.columns}, ${article.theme}, ${issue.articles.indexOf(article)}, ${article.createdAt}::timestamptz, ${article.updatedAt}::timestamptz)
      on conflict (id) do update set title=excluded.title, slug=excluded.slug, category=excluded.category, byline=excluded.byline, read_time=excluded.read_time, layout=excluded.layout, columns=excluded.columns, theme=excluded.theme, position=excluded.position, updated_at=excluded.updated_at
    `);
    for (const block of article.blocks) {
      const placementPayload = {
        ...(block.placement ?? {}),
        ...(block.frame ? { __frame: block.frame } : {}),
        ...(block.layout ? { __layout: block.layout } : {}),
      };
      queries.push(sql`
        insert into blocks (id, article_id, type, content, position, image_url, image_public_id, caption, alt_text, placement, created_at, updated_at)
        values (${block.id}::uuid, ${article.id}::uuid, ${block.type}::block_type, ${block.content}, ${block.order}, ${block.imageUrl ?? null}, ${block.imagePublicId ?? null}, ${block.caption ?? block.placement?.caption ?? null}, ${block.placement?.alt ?? ""}, ${JSON.stringify(placementPayload)}::jsonb, now(), now())
        on conflict (id) do update set type=excluded.type, content=excluded.content, position=excluded.position, image_url=excluded.image_url, image_public_id=excluded.image_public_id, caption=excluded.caption, alt_text=excluded.alt_text, placement=excluded.placement, updated_at=now()
      `);
    }
    const blockIds = article.blocks.map((block) => block.id);
    if (blockIds.length) queries.push(sql`delete from blocks where article_id=${article.id}::uuid and not (id = any(${blockIds}::uuid[]))`);
    else queries.push(sql`delete from blocks where article_id=${article.id}::uuid`);
  }

  const articleIds = issue.articles.map((article) => article.id);
  if (articleIds.length) queries.push(sql`delete from articles where issue_id=${issue.id}::uuid and not (id = any(${articleIds}::uuid[]))`);
  else queries.push(sql`delete from articles where issue_id=${issue.id}::uuid`);

  for (const page of issue.pages) {
    queries.push(sql`insert into issue_pages (id, issue_id, article_id, label, kind, position) values (${page.id}::uuid, ${issue.id}::uuid, ${page.articleId ?? null}::uuid, ${page.label}, ${page.kind}::page_kind, ${page.order})`);
  }

  await sql.transaction(queries);
  return issue;
}

export async function removeIssue(id: string, ownerUserId?: string) {
  const sql = db();
  if (ownerUserId) {
    await sql`delete from issues where id=${id}::uuid and owner_user_id=${ownerUserId}`;
    return;
  }
  await sql`delete from issues where id=${id}::uuid`;
}
