import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getIssue, removeIssue } from "@/lib/server/issue-repository";

export const dynamic = "force-dynamic";

const WRITE_GENERATION = "release-0.7-clean-v2";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const issue = await getIssue(id, user.id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("x-lexozine-write-generation") !== WRITE_GENERATION) {
    return NextResponse.json({ error: "This Lexozine tab is out of date. Refresh Studio before making changes." }, { status: 409 });
  }
  const { id } = await params;
  await removeIssue(id, user.id);
  return new Response(null, { status: 204 });
}
