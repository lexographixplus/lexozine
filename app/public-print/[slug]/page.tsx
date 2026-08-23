import { notFound } from "next/navigation";
import PrintEdition from "@/components/print-edition";
import { getPublicIssueBySlug } from "@/lib/server/issue-repository";
import "../../print/print.css";
import "../../print/pagination.css";
import "../../print/professional.css";
import "../../print/pdf-edition.css";

export const dynamic = "force-dynamic";

export default async function PublicPrintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getPublicIssueBySlug(decodeURIComponent(slug));
  if (!issue) notFound();
  return <PrintEdition issue={issue} />;
}
