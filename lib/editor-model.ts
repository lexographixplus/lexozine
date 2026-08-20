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
export type ImageAlign = "left" | "center" | "right" | "full";
export type ImageFit = "cover" | "contain";
export type TypographyPreset = "editorial-serif" | "modern-sans" | "hybrid" | "minimal";

export type ImagePlacement = {
  width: number;
  align: ImageAlign;
  fit: ImageFit;
  focalX: number;
  focalY: number;
  caption: string;
  alt: string;
};

export type TypographySettings = {
  preset: TypographyPreset;
  displayFamily: string;
  bodyFamily: string;
  bodySize: number;
  leading: number;
  tracking: number;
};

export type StoryBlock = {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  imageUrl?: string;
  imagePublicId?: string;
  caption?: string;
  focalPoint?: { x: number; y: number };
  placement?: ImagePlacement;
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

export type ProductionSettings = {
  pageSize: "A4" | "A5" | "US Letter" | "Square 210" | "Custom";
  orientation: "portrait" | "landscape";
  bleed: number;
  safeMargin: number;
  gutter: number;
  baseline: number;
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
  coverImagePublicId?: string;
  coverLines: string[];
  pages: IssuePage[];
  articles: Article[];
  production?: ProductionSettings;
  typography?: TypographySettings;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  publicId?: string;
  assetId?: string;
  mimeType: string;
  width?: number;
  height?: number;
  alt: string;
  focalX?: number;
  focalY?: number;
  createdAt: string;
};

export const themeTokens: Record<ThemeKey, { label: string; accent: string; paper: string; ink: string }> = {
  editorial: { label: "Editorial", accent: "#c87648", paper: "#f3eee6", ink: "#181715" },
  modern: { label: "Modern", accent: "#2b63ff", paper: "#f4f6f8", ink: "#111827" },
  cultural: { label: "Cultural", accent: "#b3382f", paper: "#f1e5d3", ink: "#201914" },
  minimal: { label: "Minimal", accent: "#202020", paper: "#faf9f6", ink: "#171717" },
};

export const typographyPresets: Record<TypographyPreset, Omit<TypographySettings, "preset"> & { label: string }> = {
  "editorial-serif": { label: "Editorial Serif", displayFamily: "var(--font-display)", bodyFamily: "Georgia, serif", bodySize: 10, leading: 1.72, tracking: 0 },
  "modern-sans": { label: "Modern Sans", displayFamily: "var(--font-sans)", bodyFamily: "var(--font-sans)", bodySize: 10, leading: 1.62, tracking: 0 },
  hybrid: { label: "Hybrid Journal", displayFamily: "var(--font-display)", bodyFamily: "var(--font-sans)", bodySize: 9.5, leading: 1.7, tracking: 0 },
  minimal: { label: "Minimal Digest", displayFamily: "var(--font-sans)", bodyFamily: "Georgia, serif", bodySize: 10, leading: 1.78, tracking: 0.2 },
};

export const defaultTypographySettings: TypographySettings = {
  preset: "editorial-serif",
  displayFamily: typographyPresets["editorial-serif"].displayFamily,
  bodyFamily: typographyPresets["editorial-serif"].bodyFamily,
  bodySize: typographyPresets["editorial-serif"].bodySize,
  leading: typographyPresets["editorial-serif"].leading,
  tracking: typographyPresets["editorial-serif"].tracking,
};

export const defaultProductionSettings: ProductionSettings = {
  pageSize: "A4",
  orientation: "portrait",
  bleed: 3,
  safeMargin: 12,
  gutter: 6,
  baseline: 12,
};

export const defaultImagePlacement: ImagePlacement = {
  width: 65,
  align: "center",
  fit: "cover",
  focalX: 50,
  focalY: 50,
  caption: "",
  alt: "",
};

export function createId(_prefix?: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("Secure UUID generation is unavailable in this environment");
}
