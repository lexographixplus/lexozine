import IssueWorkspace from "@/components/issue-workspace";
import "../editorial-workflow.css";

export default async function IssueWorkspacePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <IssueWorkspace issueId={issueId} />;
}
