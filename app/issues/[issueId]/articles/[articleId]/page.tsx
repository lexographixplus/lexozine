import ArticleEditor from "@/components/article-editor";
import "../../../editorial-workflow.css";

export default async function ArticleEditorPage({ params }: { params: Promise<{ issueId: string; articleId: string }> }) {
  const { issueId, articleId } = await params;
  return <ArticleEditor issueId={issueId} articleId={articleId} />;
}
