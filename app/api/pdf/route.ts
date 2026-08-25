import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getIssue } from "@/lib/server/issue-repository";
import { fileSafe, renderPrintPdf } from "@/lib/server/print-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestUrl = new URL(request.url);
  const issueId = requestUrl.searchParams.get("issue");
  if (!issueId) return NextResponse.json({ error: "Issue id is required" }, { status: 400 });
  const issue = await getIssue(issueId, user.id);
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  try {
    const origin = requestUrl.origin;
    const pdf = await renderPrintPdf({
      origin,
      printPath: `/print?issue=${encodeURIComponent(issue.id)}`,
      production: issue.production,
      cookie: request.headers.get("cookie") ?? "",
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="lexozine-${issue.number}-${fileSafe(issue.title)}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json(
      { error: "PDF generation failed", detail: error instanceof Error ? error.message : "Unknown PDF error" },
      { status: 500 },
    );
  }
}
