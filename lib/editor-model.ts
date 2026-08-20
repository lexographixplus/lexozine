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
export type CoverMode = "generated" | "imported";
export type CoverAssetKind = "front" | "wrap";
export type CoverTextAlign = "left" | "center" | "right";
export type CoverOverlayType = "none" | "solid" | "gradient";
export type PaletteSource = "theme" | "cover" | "custom";

export type FrameGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
};

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

export type IssuePalette = {
  source: PaletteSource;
  primary: string;
  secondary: string;
  background: string;
  ink: string;
  muted: string;
};

export type CoverAsset = {
  id: string;
  name: string;
  url: string;
  publicId?: string;
  mimeType: string;
  kind: CoverAssetKind;
  createdAt: string;
};

export type CoverOverlay = {
  type: CoverOverlayType;
  color: string;
  opacity: number;
};

export type CoverDesign = {
  mode: CoverMode;
  templateId: string;
  masthead: string;
  mainHeadline: string;
  deck: string;
  lines: string[];
  textAlign: CoverTextAlign;
  heroImageUrl?: string;
  heroImagePublicId?: string;
  heroFocalX: number;
  heroFocalY: number;
  overlay: CoverOverlay;
  assets: CoverAsset[];
  activeAssetId?: string;
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
  frame?: FrameGeometry;
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
  cover?: CoverDesign;
  palette?: IssuePalette;
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

export function defaultFrameFor(type: BlockType, order = 0): FrameGeometry {
  if (type === "headline") return { x: 8, y: 8, width: 84, height: 18, rotation: 0, zIndex: 20 + order, locked: false };
  if (type === "deck") return { x: 8, y: 28, width: 58, height: 10, rotation: 0, zIndex: 20 + order, locked: false };
  if (type === "image") return { x: 8, y: 41, width: 48, height: 38, rotation: 0, zIndex: 10 + order, locked: false };
  if (type === "pullquote") return { x: 60, y: 43, width: 32, height: 20, rotation: 0, zIndex: 30 + order, locked: false };
  return { x: order % 2 ? 52 : 8, y: 42 + Math.floor(order / 2) * 23, width: 40, height: 20, rotation: 0, zIndex: 15 + order, locked: false };
}

export function createId(_prefix?: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("Secure UUID generation is unavailable in this environment");
}
