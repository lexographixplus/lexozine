import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

const protectedProxy = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  if (!authConfigured) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Lexozine authentication is not configured." }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/auth/setup-required", request.url));
  }
  return protectedProxy(request);
}

export const config = {
  matcher: [
    "/",
    "/issues/:path*",
    "/canvas/:path*",
    "/layouts/:path*",
    "/blocks/:path*",
    "/styles/:path*",
    "/media/:path*",
    "/assist/:path*",
    "/review/:path*",
    "/history/:path*",
    "/setup/:path*",
    "/export/:path*",
    "/preview/:path*",
    "/api/issues/:path*",
    "/api/media/:path*",
    "/api/review/:path*",
    "/api/versions/:path*",
    "/api/pdf/:path*",
  ],
};
