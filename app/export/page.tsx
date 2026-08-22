import ExportCenter from "@/components/export-center";
import IssueNavigation from "@/components/issue-navigation";
import "./export.css";
import "../issues/release-07.css";

export default async function ExportPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue: issueId } = await searchParams;
  return <>{issueId ? <IssueNavigation issueId={issueId} active="export"/> : null}<ExportCenter/></>;
}
