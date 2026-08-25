import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { parseLexoBooksEdition } from "@/lib/lexobooks-edition";
import { getIssue, saveIssue } from "@/lib/server/issue-repository";

export const dynamic = "force-dynamic";

const WRITE_GENERATION = "release-0.7-clean-v2";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("x-lexozine-write-generation") !== WRITE_GENERATION) {
    return NextResponse.json({ error: "This Lexozine tab is out of date. Refresh Studio before importing an edition." }, { status: 409 });
  }

  const { id } = await params;
  const issue = await getIssue(id, user.id);
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  try {
    const fixedLayout = parseLexoBooksEdition(await request.json());
    const saved = await saveIssue({ ...issue, fixedLayout }, user.id);
    return NextResponse.json({ issue: saved, fixedLayout: saved.fixedLayout });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid LexoBooks edition";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
