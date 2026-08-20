import DigitalEdition from "@/components/digital-edition";
import { getIssue, listIssues } from "@/lib/server/issue-repository";
import "./preview.css";
import "./preview-v2.css";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue: issueId } = await searchParams;
  const issue = issueId ? await getIssue(issueId) : (await listIssues())[0] ?? null;
  return <DigitalEdition initialIssue={issue ?? undefined} />;
}
