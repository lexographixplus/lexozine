import fs from "node:fs";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { Issue } from "@/lib/editor-model";

type PrintPdfOptions = {
  origin: string;
  printPath: string;
  production?: Issue["production"];
  cookie?: string;
};

export function fileSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "lexozine";
}

async function chromiumExecutablePath() {
  const tracedBin = path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin");
  return fs.existsSync(tracedBin) ? chromium.executablePath(tracedBin) : chromium.executablePath();
}

export async function renderPrintPdf({ origin, printPath, production, cookie }: PrintPdfOptions) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 1800, deviceScaleFactor: 1 },
      executablePath: await chromiumExecutablePath(),
      headless: "shell",
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", (intercepted) => {
      if (cookie && intercepted.url().startsWith(origin)) {
        void intercepted.continue({ headers: { ...intercepted.headers(), cookie } });
      } else {
        void intercepted.continue();
      }
    });

    const response = await page.goto(new URL(printPath, origin).toString(), { waitUntil: "networkidle0", timeout: 45_000 });
    if (!response?.ok()) throw new Error(`Print composition returned ${response?.status() ?? "no response"}`);
    await page.emulateMediaType("print");

    const size = production?.pageSize ?? "A4";
    const format = size === "US Letter" ? "letter" : size === "A5" ? "a5" : "a4";
    return page.pdf({
      format,
      landscape: production?.orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    if (browser) await browser.close();
  }
}
