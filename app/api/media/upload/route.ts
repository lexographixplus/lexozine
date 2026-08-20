import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
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

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const issueId = String(form.get("issueId") ?? "").trim() || null;
  const alt = String(form.get("alt") ?? "").trim();
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Images must be 25 MB or smaller" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadBuffer(buffer, `lexozine/${issueId ?? "library"}`, file.name);
  const sql = db();
  const rows = await sql`
    insert into media_assets (issue_id, cloudinary_public_id, asset_id, name, secure_url, mime_type, width, height, alt_text, created_by)
    values (${issueId}::uuid, ${result.public_id}, ${result.asset_id ?? null}, ${file.name}, ${result.secure_url}, ${file.type}, ${result.width ?? null}, ${result.height ?? null}, ${alt}, ${user.id})
    returning *
  ` as any[];
  const row = rows[0];
  return NextResponse.json({
    asset: {
      id: row.id,
      name: row.name,
      url: row.secure_url,
      publicId: row.cloudinary_public_id,
      assetId: row.asset_id ?? undefined,
      mimeType: row.mime_type,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      alt: row.alt_text,
      focalX: Number(row.focal_x),
      focalY: Number(row.focal_y),
      createdAt: new Date(row.created_at).toISOString(),
    },
  });
}
