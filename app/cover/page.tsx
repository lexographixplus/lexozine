import CoverWorkspace from "@/components/cover-workspace";
import IssueNavigation from "@/components/issue-navigation";
import "./cover.css";
import "../issues/release-07.css";

export default async function CoverPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue } = await searchParams;
  return <>{issue ? <IssueNavigation issueId={issue} active="cover"/> : null}<CoverWorkspace /></>;
}
