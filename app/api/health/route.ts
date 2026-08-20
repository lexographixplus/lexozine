import { NextResponse } from "next/server";
import { authConfigured } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    auth: authConfigured,
    cloudinary: Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    pdf: true,
  };

  if (process.env.DATABASE_URL) {
    try {
      await db()`select 1 as ok`;
      checks.database = true;
    } catch {
      checks.database = false;
    }
  }

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { service: "lexozine-v2", ready, checks },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
