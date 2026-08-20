import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

const handlers = auth.handler();
type RouteContext = { params: Promise<{ path: string[] }> };

function notConfigured() {
  return NextResponse.json(
    { error: "Lexozine authentication is not configured for this deployment." },
    { status: 503 },
  );
}

export async function GET(request: Request, context: RouteContext) {
  if (!authConfigured) return notConfigured();
  return handlers.GET(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  if (!authConfigured) return notConfigured();
  return handlers.POST(request, context);
}
