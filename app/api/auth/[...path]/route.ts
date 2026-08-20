import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

const handlers = auth.handler();

function notConfigured() {
  return NextResponse.json(
    { error: "Lexozine authentication is not configured for this deployment." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  if (!authConfigured) return notConfigured();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (!authConfigured) return notConfigured();
  return handlers.POST(request);
}
