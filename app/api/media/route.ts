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

function asset(row: any) {
  return {
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
  };
}

export async function GET(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const issueId = new URL(request.url).searchParams.get("issue");
  const sql = db();
  const rows = (issueId
    ? await sql`select * from media_assets where issue_id=${issueId}::uuid or issue_id is null order by created_at desc`
    : await sql`select * from media_assets order by created_at desc`) as any[];
  return NextResponse.json({ assets: rows.map(asset) });
}

export async function PATCH(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { id?: string; alt?: string; focalX?: number; focalY?: number };
  if (!body.id) return NextResponse.json({ error: "Asset id is required" }, { status: 400 });
  const rows = await db()`
    update media_assets
    set alt_text=coalesce(${body.alt ?? null}, alt_text),
        focal_x=coalesce(${body.focalX ?? null}, focal_x),
        focal_y=coalesce(${body.focalY ?? null}, focal_y)
    where id=${body.id}::uuid
    returning *
  ` as any[];
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ asset: asset(rows[0]) });
}

export async function DELETE(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Asset id is required" }, { status: 400 });
  const rows = await db()`select * from media_assets where id=${id}::uuid` as any[];
  const row = rows[0];
  if (!row) return new Response(null, { status: 204 });
  await getCloudinary().uploader.destroy(row.cloudinary_public_id, { resource_type: "image", invalidate: true });
  await db()`delete from media_assets where id=${id}::uuid`;
  return new Response(null, { status: 204 });
}
