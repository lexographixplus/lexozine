import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { auth } from "@/lib/auth/server";
import { getIssue } from "@/lib/server/issue-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

function fileSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "lexozine";
}

export async function GET(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestUrl = new URL(request.url);
  const issueId = requestUrl.searchParams.get("issue");
  if (!issueId) return NextResponse.json({ error: "Issue id is required" }, { status: 400 });
  const issue = await getIssue(issueId);
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    defaultViewport: { width: 1440, height: 1800, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    const origin = requestUrl.origin;
    const cookie = request.headers.get("cookie") ?? "";
    await page.setRequestInterception(true);
    page.on("request", (intercepted) => {
      const target = intercepted.url();
      if (cookie && target.startsWith(origin)) {
        void intercepted.continue({ headers: { ...intercepted.headers(), cookie } });
      } else {
        void intercepted.continue();
      }
    });

    const previewUrl = `${origin}/preview?issue=${encodeURIComponent(issue.id)}&print=1`;
    const response = await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 45000 });
    if (!response?.ok()) throw new Error(`Print view returned ${response?.status() ?? "no response"}`);
    await page.emulateMediaType("print");

    const size = issue.production?.pageSize ?? "A4";
    const format = size === "US Letter" ? "letter" : size === "A5" ? "a5" : "a4";
    const pdf = await page.pdf({
      format,
      landscape: issue.production?.orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="lexozine-${issue.number}-${fileSafe(issue.title)}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } finally {
    await browser.close();
  }
}
