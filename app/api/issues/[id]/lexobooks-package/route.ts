import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getCloudinary } from "@/lib/cloudinary";
import { readLexoBooksPackage } from "@/lib/lexobooks-package-archive";
import { parseLexoBooksEdition } from "@/lib/lexobooks-edition";
import { getIssue, saveIssue } from "@/lib/server/issue-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRITE_GENERATION = "release-0.7-clean-v2";
const MAX_PACKAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

function uploadBuffer(buffer: Buffer, options: Record<string, unknown>) {
  const cloudinary = getCloudinary();
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}

function extension(path: string) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function replaceAssetUrls(svg: string, assets: Map<string, string>) {
  return svg.replace(/(href|xlink:href)=(["'])(assets\/[^"']+)\2/g, (_match, attribute: string, quote: string, path: string) => {
    const url = assets.get(path);
    if (!url) throw new Error(`SVG references an unavailable asset: ${path}`);
    return `${attribute}=${quote}${url}${quote}`;
  });
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
    const form = await request.formData();
    const file = form.get("package");
    if (!(file instanceof File)) return NextResponse.json({ error: "A LexoBooks ZIP package is required" }, { status: 400 });
    if (file.size > MAX_PACKAGE_BYTES) return NextResponse.json({ error: "LexoBooks packages must be 25 MB or smaller" }, { status: 413 });

    const imported = readLexoBooksPackage(Buffer.from(await file.arrayBuffer()));
    const folder = `lexozine/${issue.id}/editions/${imported.edition.buildId}`;
    const assetUrls = new Map<string, string>();

    for (const [index, asset] of imported.assets.entries()) {
      if (!IMAGE_EXTENSIONS.has(extension(asset.path))) {
        throw new Error(`Unsupported package asset: ${asset.path}`);
      }
      const result = await uploadBuffer(asset.data, {
        resource_type: "image",
        folder: `${folder}/assets`,
        public_id: `asset-${index + 1}`,
        overwrite: false,
        filename_override: asset.path.split("/").at(-1),
      });
      assetUrls.set(asset.path, String(result.secure_url));
    }

    const pages = [];
    for (const page of imported.pages) {
      const svg = replaceAssetUrls(page.svg, assetUrls);
      const result = await uploadBuffer(Buffer.from(svg, "utf8"), {
        resource_type: "image",
        folder: `${folder}/pages`,
        public_id: `page-${String(page.number).padStart(4, "0")}`,
        overwrite: false,
        filename_override: `page-${String(page.number).padStart(4, "0")}.svg`,
      });
      const url = String(result.secure_url);
      pages.push({ number: page.number, label: page.label, svgUrl: url, previewUrl: url });
    }

    const fixedLayout = parseLexoBooksEdition({ ...imported.edition, pages });
    const saved = await saveIssue({ ...issue, fixedLayout }, user.id);
    return NextResponse.json({ issue: saved, fixedLayout: saved.fixedLayout, warnings: imported.warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LexoBooks package import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
