export type IssueStatus = "draft" | "review" | "published";
export type PageKind = "cover" | "toc" | "article";
export type BlockType =
  | "headline"
  | "deck"
  | "body"
  | "pullquote"
  | "sidebar"
  | "image"
  | "caption";

export type ThemeKey = "editorial" | "modern" | "cultural" | "minimal";

export type StoryBlock = {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  imageUrl?: string;
  caption?: string;
  focalPoint?: { x: number; y: number };
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  category: string;
  byline: string;
  readTime: string;
  layout: "feature" | "essay" | "interview" | "visual";
  columns: 1 | 2 | 3;
  theme: ThemeKey;
  blocks: StoryBlock[];
  createdAt: string;
  updatedAt: string;
};

export type IssuePage = {
  id: string;
  label: string;
  kind: PageKind;
  articleId?: string;
  order: number;
};

export type Issue = {
  id: string;
  title: string;
  number: string;
  editionDate: string;
  status: IssueStatus;
  description: string;
  theme: ThemeKey;
  coverImageUrl?: string;
  coverLines: string[];
  pages: IssuePage[];
  articles: Article[];
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  alt: string;
  createdAt: string;
};

export const themeTokens: Record<ThemeKey, { label: string; accent: string; paper: string; ink: string }> = {
  editorial: { label: "Editorial", accent: "#c87648", paper: "#f3eee6", ink: "#181715" },
  modern: { label: "Modern", accent: "#2b63ff", paper: "#f4f6f8", ink: "#111827" },
  cultural: { label: "Cultural", accent: "#b3382f", paper: "#f1e5d3", ink: "#201914" },
  minimal: { label: "Minimal", accent: "#202020", paper: "#faf9f6", ink: "#171717" },
};

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
