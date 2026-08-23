import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DigitalEdition from "@/components/digital-edition";
import { resolveCoverImageUrl } from "@/lib/magazine-design";
import { publicIssueUrl } from "@/lib/publication";
import { getPublicIssueBySlug } from "@/lib/server/issue-repository";
import "../preview/preview.css";
import "../preview/preview-v2.css";
import "../preview/poetry-columns.css";
import "../preview/reader-layouts.css";
import "../preview/literary-reader.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getPublicIssueBySlug(decodeURIComponent(slug));
  if (!issue) return { title: "Magazine not found · Lexozine" };

  const url = publicIssueUrl(issue);
  const cover = resolveCoverImageUrl(issue);
  const indexable = issue.visibility === "public";

  return {
    title: `${issue.title} · Lexozine`,
    description: issue.description,
    alternates: { canonical: url },
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: "article",
      title: issue.title,
      description: issue.description,
      url,
      siteName: "Lexozine",
      publishedTime: issue.publishedAt,
      images: cover ? [{ url: cover, alt: `${issue.title} cover` }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: issue.title,
      description: issue.description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PublicReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getPublicIssueBySlug(decodeURIComponent(slug));
  if (!issue) notFound();
  return <DigitalEdition initialIssue={issue} />;
}
