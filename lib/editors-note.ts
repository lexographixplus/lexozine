import type { Article, Issue } from "./editor-model";
import { defaultProductionSettings } from "./editor-model";

type WorkflowWithEditorsNote = NonNullable<NonNullable<Issue["production"]>["editorialWorkflow"]> & {
  editorsNoteArticleId?: string;
};

function articleSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function workflow(issue: Issue): WorkflowWithEditorsNote | undefined {
  return issue.production?.editorialWorkflow as WorkflowWithEditorsNote | undefined;
}

export function findEditorsNote(issue: Issue | null | undefined): Article | null {
  if (!issue) return null;

  const linkedId = workflow(issue)?.editorsNoteArticleId;
  if (linkedId) {
    const linked = issue.articles.find((article) => article.id === linkedId);
    if (linked) return linked;
  }

  const pageLinked = issue.pages.find((page) => {
    const label = articleSlug(page.label);
    return page.articleId && (label === "editor-s-note" || label === "editors-note");
  });
  if (pageLinked?.articleId) {
    const linked = issue.articles.find((article) => article.id === pageLinked.articleId);
    if (linked) return linked;
  }

  const exact = issue.articles.find((article) => {
    const slug = articleSlug(article.title);
    return slug === "editor-s-note" || slug === "editors-note";
  });
  if (exact) return exact;

  return issue.articles.find((article) => article.category.trim().toLowerCase() === "editorial") ?? null;
}

export function setEditorsNoteArticleId(issue: Issue, articleId: string): Issue {
  const production = issue.production ?? defaultProductionSettings;
  const editorialWorkflow = (production.editorialWorkflow ?? {}) as WorkflowWithEditorsNote;
  return {
    ...issue,
    production: {
      ...production,
      editorialWorkflow: {
        ...editorialWorkflow,
        editorsNoteArticleId: articleId,
      } as typeof production.editorialWorkflow,
    },
    updatedAt: new Date().toISOString(),
  };
}
