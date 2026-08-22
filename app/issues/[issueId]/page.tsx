import EditorsNoteShortcut from "@/components/editors-note-shortcut";
import IssueWorkspace from "@/components/issue-workspace";
import "../editorial-workflow.css";
import "../creation-refinement.css";
import "../release-07.css";
import "../editors-note.css";

export default async function IssueWorkspacePage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  return <><IssueWorkspace issueId={issueId} /><EditorsNoteShortcut issueId={issueId} /></>;
}
