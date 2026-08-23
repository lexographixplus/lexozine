import { NextResponse } from "next/server";
import { getPublicIssueBySlug } from "@/lib/server/issue-repository";
import { fileSafe, renderPrintPdf } from "@/lib/server/print-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getPublicIssueBySlug(decodeSlug(slug));
  if (!issue) return NextResponse.json({ error: "Published issue not found" }, { status: 404 });

  try {
    const requestUrl = new URL(request.url);
    const pdf = await renderPrintPdf({
      origin: requestUrl.origin,
      printPath: `/print?slug=${encodeURIComponent(issue.publicSlug ?? slug)}`,
      production: issue.production,
    });
    const inline = requestUrl.searchParams.get("preview") === "1";

    return new Response(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${inline ? "inline" : "attachment"}; filename="lexozine-${issue.number}-${fileSafe(issue.title)}.pdf"`,
        "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Public PDF generation failed", error);
    return NextResponse.json(
      { error: "PDF generation failed", detail: error instanceof Error ? error.message : "Unknown PDF error" },
      { status: 500 },
    );
  }
}
