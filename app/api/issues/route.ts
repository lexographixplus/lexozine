import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import type { Issue } from "@/lib/editor-model";
import { listIssues, saveIssue } from "@/lib/server/issue-repository";

export const dynamic = "force-dynamic";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ issues: await listIssues() });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const issue = await request.json() as Issue;
  const saved = await saveIssue(issue, user.id);
  return NextResponse.json({ issue: saved });
}

export async function POST(request: Request) {
  return PUT(request);
}
