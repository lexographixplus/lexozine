import PrintEdition from "@/components/print-edition";
import { getIssue, getPublicIssueBySlug, listIssues } from "@/lib/server/issue-repository";
import "./print.css";
import "./pagination.css";
import "./professional.css";
import "./pdf-edition.css";

export const dynamic = "force-dynamic";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ issue?: string; slug?: string }> }) {
  const { issue: issueId, slug } = await searchParams;
  const issue = slug ? await getPublicIssueBySlug(slug) : issueId ? await getIssue(issueId) : (await listIssues())[0] ?? null;
  if (!issue) return <main className="print-empty">No issue is available for print rendering.</main>;
  return <PrintEdition issue={issue} />;
}
