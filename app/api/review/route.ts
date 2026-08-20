import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ReviewScope = "issue" | "article" | "block";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

function mapComment(row: any) {
  return {
    id: row.id,
    issueId: row.issue_id,
    articleId: row.article_id ?? undefined,
    blockId: row.block_id ?? undefined,
    scope: row.scope as ReviewScope,
    author: row.author_name || "Lexozine Editorial",
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    resolved: row.resolved,
  };
}

export async function GET(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const issueId = new URL(request.url).searchParams.get("issue");
  if (!issueId) return NextResponse.json({ error: "Issue id is required" }, { status: 400 });
  const rows = await db()`select * from review_comments where issue_id=${issueId}::uuid order by created_at desc` as any[];
  return NextResponse.json({ comments: rows.map(mapComment) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { issueId?: string; articleId?: string; blockId?: string; body?: string };
  if (!body.issueId || !body.body?.trim()) return NextResponse.json({ error: "Issue and comment are required" }, { status: 400 });
  const scope: ReviewScope = body.blockId ? "block" : body.articleId ? "article" : "issue";
  const rows = await db()`
    insert into review_comments (issue_id, article_id, block_id, scope, body, author_user_id, author_name)
    values (${body.issueId}::uuid, ${body.articleId ?? null}::uuid, ${body.blockId ?? null}::uuid, ${scope}::review_scope, ${body.body.trim()}, ${user.id ?? null}, ${user.name ?? user.email ?? "Lexozine Editorial"})
    returning *
  ` as any[];
  return NextResponse.json({ comment: mapComment(rows[0]) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { id?: string; resolved?: boolean };
  if (!body.id || typeof body.resolved !== "boolean") return NextResponse.json({ error: "Comment id and resolved state are required" }, { status: 400 });
  const rows = await db()`
    update review_comments
    set resolved=${body.resolved},
        resolved_by=case when ${body.resolved} then ${user.id ?? null} else null end,
        resolved_at=case when ${body.resolved} then now() else null end,
        updated_at=now()
    where id=${body.id}::uuid
    returning *
  ` as any[];
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ comment: mapComment(rows[0]) });
}
