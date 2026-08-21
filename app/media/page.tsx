import IssueNavigation from "@/components/issue-navigation";
import MediaLibrary from "@/components/media-library";
import "./media.css";
import "../issues/release-07.css";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const { issue } = await searchParams;
  return <>{issue ? <IssueNavigation issueId={issue} active="media"/> : null}<MediaLibrary /></>;
}
