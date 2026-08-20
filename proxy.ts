import { auth } from "@/lib/auth/server";

export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/issues/:path*", "/layouts/:path*", "/blocks/:path*", "/styles/:path*", "/media/:path*", "/assist/:path*", "/review/:path*", "/history/:path*", "/setup/:path*", "/export/:path*", "/api/issues/:path*", "/api/media/:path*", "/api/pdf/:path*"],
};
