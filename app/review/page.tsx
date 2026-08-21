import IssueNavigation from "@/components/issue-navigation";
import ReviewWorkspace from "@/components/review-workspace";
import "../utility.css";
import "./review.css";
import "../issues/release-07.css";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ issue?: string }> }) {
  const params = await searchParams;
  return <>{params.issue ? <IssueNavigation issueId={params.issue} active="review"/> : null}<ReviewWorkspace/></>;
}
