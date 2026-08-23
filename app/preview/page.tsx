import DigitalEdition from "@/components/digital-edition";
import IssueNavigation from "@/components/issue-navigation";
import { getIssue, listIssues } from "@/lib/server/issue-repository";
import "./preview.css";
import "./preview-v2.css";
import "./poetry-columns.css";
import "./reader-layouts.css";
import "../issues/release-07.css";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue: issueId } = await searchParams;
  const issue = issueId ? await getIssue(issueId) : (await listIssues())[0] ?? null;
  return <>{issue ? <IssueNavigation issueId={issue.id} active="preview"/> : null}<DigitalEdition initialIssue={issue ?? undefined} /></>;
}
