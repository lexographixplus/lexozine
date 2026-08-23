import type { Issue } from "./editor-model";

// Set this in production when the public reader has its own domain. A relative
// path is deliberately safer than sending readers to the LexoStudio marketing
// site when that variable has not yet been configured.
export const PUBLIC_READER_ORIGIN = process.env.NEXT_PUBLIC_READER_ORIGIN?.replace(/\/$/, "");

const RESERVED_PUBLICATION_SLUGS = new Set([
  "api",
  "auth",
  "studio",
  "issues",
  "canvas",
  "cover",
  "layouts",
  "blocks",
  "styles",
  "media",
  "assist",
  "review",
  "history",
  "setup",
  "export",
  "preview",
  "print",
  "_next",
  "favicon-ico",
  "robots-txt",
  "sitemap-xml",
]);

export function slugifyPublicationTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "issue";
}

export function normalizePublicationSlug(value: string) {
  const slug = slugifyPublicationTitle(value);
  return RESERVED_PUBLICATION_SLUGS.has(slug) ? `${slug}-magazine` : slug;
}

export function ensurePublicationSlug(issue: Issue) {
  return normalizePublicationSlug(issue.publicSlug?.trim() || issue.title);
}

export function publicIssuePath(issue: Pick<Issue, "title" | "publicSlug">) {
  const slug = normalizePublicationSlug(issue.publicSlug?.trim() || issue.title);
  return `/${encodeURIComponent(slug)}`;
}

export function publicIssueUrl(issue: Pick<Issue, "title" | "publicSlug">) {
  const path = publicIssuePath(issue);
  return PUBLIC_READER_ORIGIN ? `${PUBLIC_READER_ORIGIN}${path}` : path;
}
