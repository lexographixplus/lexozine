import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "https://ep-cool-pond-ax00bmnw.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth";
const buildOnlySecret = "lexozine-build-only-cookie-secret-not-for-runtime";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET ?? (isProductionBuild ? buildOnlySecret : undefined);

if (!cookieSecret) {
  throw new Error("NEON_AUTH_COOKIE_SECRET is required at runtime and must be at least 32 characters");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});
