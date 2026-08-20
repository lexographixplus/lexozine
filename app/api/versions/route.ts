import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import type { Issue } from "@/lib/editor-model";

export const dynamic = "force-dynamic";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

function mapVersion(row: any) {
  return {
    id: row.id,
    issueId: row.issue_id,
    label: row.note?.split("\n")[0] || "Editorial checkpoint",
    author: row.created_by || "Lexozine Studio",
    time: new Date(row.created_at).toISOString(),
    note: row.note || "Editorial checkpoint",
    status: row.snapshot?.status === "published" ? "approved" : row.snapshot?.status === "review" ? "review" : "saved",
    snapshot: row.snapshot as Issue,
  };
}

export async function GET(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const issueId = new URL(request.url).searchParams.get("issue");
  if (!issueId) return NextResponse.json({ error: "Issue id is required" }, { status: 400 });
  const rows = await db()`select * from issue_versions where issue_id=${issueId}::uuid order by created_at desc` as any[];
  return NextResponse.json({ versions: rows.map(mapVersion) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { issue?: Issue; note?: string };
  if (!body.issue) return NextResponse.json({ error: "Issue snapshot is required" }, { status: 400 });
  const rows = await db()`
    insert into issue_versions (issue_id, snapshot, note, created_by)
    values (${body.issue.id}::uuid, ${JSON.stringify(body.issue)}::jsonb, ${body.note?.trim() || "Editorial checkpoint"}, ${user.name ?? user.email ?? user.id ?? "Lexozine Studio"})
    returning *
  ` as any[];
  return NextResponse.json({ version: mapVersion(rows[0]) }, { status: 201 });
}
