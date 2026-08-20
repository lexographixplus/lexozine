import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUser() {
  const result = await auth.getSession() as any;
  return result?.user ?? result?.data?.user ?? result?.data?.session?.user ?? null;
}

function uploadBuffer(buffer: Buffer, folder: string, originalName: string) {
  const cloudinary = getCloudinary();
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: originalName,
        quality_analysis: true,
      },
      (error, result) => error ? reject(error) : resolve(result),
    );
    stream.end(buffer);
  });
}

function pdfPreviewUrl(sourceUrl: string) {
  return sourceUrl
    .replace("/upload/", "/upload/pg_1,f_jpg,q_auto/")
    .replace(/\.pdf$/i, ".jpg");
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const issueId = String(form.get("issueId") ?? "").trim();
  const requestedKind = String(form.get("kind") ?? "front");
  const kind = requestedKind === "wrap" ? "wrap" : "front";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A cover file is required" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Cover files must be JPG, PNG, WEBP, or PDF" }, { status: 400 });
  }
  if (file.size > 40 * 1024 * 1024) {
    return NextResponse.json({ error: "Cover files must be 40 MB or smaller" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(buffer, `lexozine/${issueId || "library"}/covers`, file.name);
    const sourceUrl = String(result.secure_url);
    const previewUrl = isPdf ? pdfPreviewUrl(sourceUrl) : sourceUrl;

    return NextResponse.json({
      asset: {
        id: String(result.asset_id ?? `${result.public_id}-${result.version ?? Date.now()}`),
        name: file.name,
        url: previewUrl,
        sourceUrl,
        publicId: result.public_id,
        mimeType: isPdf ? "application/pdf" : file.type,
        kind,
        width: result.width ?? undefined,
        height: result.height ?? undefined,
        pages: result.pages ?? undefined,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cover upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
