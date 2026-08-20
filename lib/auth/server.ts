import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "https://ep-cool-pond-ax00bmnw.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth";
const configuredSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const authConfigured = Boolean(configuredSecret && configuredSecret.length >= 32);

// Neon Auth requires a cookie secret at module initialization, including during
// Next.js build analysis. When production configuration is absent we generate an
// ephemeral, non-predictable value so builds can complete; protected runtime
// routes fail closed via `authConfigured` until the real Vercel secret is set.
const ephemeralSecret = `lexozine-${globalThis.crypto.randomUUID()}-${globalThis.crypto.randomUUID()}`;
const cookieSecret = authConfigured ? configuredSecret! : ephemeralSecret;

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});
