import type { ArticleWorkflowStatus, Issue } from "./editor-model";
import { defaultProductionSettings } from "./editor-model";

export const articleWorkflowLabels: Record<ArticleWorkflowStatus, string> = {
  draft: "Draft",
  editing: "Editing",
  review: "Ready for review",
  approved: "Approved",
};

export function getArticleWorkflowStatus(issue: Issue, articleId: string): ArticleWorkflowStatus {
  return issue.production?.editorialWorkflow?.articleStatuses?.[articleId] ?? "draft";
}

export function setArticleWorkflowStatus(issue: Issue, articleId: string, status: ArticleWorkflowStatus): Issue {
  const production = issue.production ?? defaultProductionSettings;
  const articleStatuses = {
    ...(production.editorialWorkflow?.articleStatuses ?? {}),
    [articleId]: status,
  };
  return {
    ...issue,
    production: {
      ...production,
      editorialWorkflow: {
        ...(production.editorialWorkflow ?? {}),
        articleStatuses,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function articleReadiness(issue: Issue) {
  const total = issue.articles.length;
  const approved = issue.articles.filter((article) => getArticleWorkflowStatus(issue, article.id) === "approved").length;
  const review = issue.articles.filter((article) => getArticleWorkflowStatus(issue, article.id) === "review").length;
  const editing = issue.articles.filter((article) => getArticleWorkflowStatus(issue, article.id) === "editing").length;
  const draft = Math.max(0, total - approved - review - editing);
  const percentage = total ? Math.round((approved / total) * 100) : 0;
  return { total, approved, review, editing, draft, percentage };
}
