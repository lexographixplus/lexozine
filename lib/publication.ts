import type { Issue } from "./editor-model";

export const PUBLIC_READER_ORIGIN = process.env.NEXT_PUBLIC_READER_ORIGIN ?? "https://read.lexographixplus.com";

export function slugifyPublicationTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "issue";
}

export function ensurePublicationSlug(issue: Issue) {
  return issue.publicSlug?.trim() || slugifyPublicationTitle(issue.title);
}

export function publicIssueUrl(issue: Pick<Issue, "title" | "publicSlug">) {
  const slug = issue.publicSlug?.trim() || slugifyPublicationTitle(issue.title);
  return `${PUBLIC_READER_ORIGIN.replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
}
