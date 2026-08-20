import type { CoverDesign, Issue, IssuePalette, ProductionSettings, ThemeKey } from "./editor-model";
import { defaultProductionSettings, themeTokens } from "./editor-model";

export type MagazineLayoutKind =
  | "cover"
  | "editorial"
  | "feature"
  | "interview"
  | "essay"
  | "poetry"
  | "photo-essay"
  | "profile"
  | "advertisement"
  | "closing";

export type MagazineLayoutRecipe = {
  id: string;
  kind: MagazineLayoutKind;
  name: string;
  description: string;
  recommendedColumns: 1 | 2 | 3;
  imageEmphasis: "low" | "medium" | "high";
  textDensity: "low" | "medium" | "high";
};

export const magazineLayoutRecipes: MagazineLayoutRecipe[] = [
  { id: "cover-editorial", kind: "cover", name: "Editorial Cover", description: "Strong masthead, dominant image and controlled cover-line hierarchy.", recommendedColumns: 1, imageEmphasis: "high", textDensity: "low" },
  { id: "cover-minimal", kind: "cover", name: "Minimal Cover", description: "Quiet typography, restrained cover lines and generous negative space.", recommendedColumns: 1, imageEmphasis: "medium", textDensity: "low" },
  { id: "cover-culture", kind: "cover", name: "Culture Cover", description: "Expressive image treatment, bold headline rhythm and layered supporting lines.", recommendedColumns: 1, imageEmphasis: "high", textDensity: "medium" },
  { id: "editors-note", kind: "editorial", name: "Editor's Note", description: "Quiet opening page with a strong title, short introduction and optional portrait.", recommendedColumns: 1, imageEmphasis: "medium", textDensity: "medium" },
  { id: "feature-opener", kind: "feature", name: "Feature Opener", description: "Large headline, deck and hero image for long-form story openings.", recommendedColumns: 2, imageEmphasis: "high", textDensity: "medium" },
  { id: "interview-portrait", kind: "interview", name: "Portrait Interview", description: "Portrait-led Q&A layout with strong speaker hierarchy.", recommendedColumns: 2, imageEmphasis: "high", textDensity: "medium" },
  { id: "classic-essay", kind: "essay", name: "Classic Essay", description: "Text-led literary spread with generous margins and pull-quote rhythm.", recommendedColumns: 2, imageEmphasis: "medium", textDensity: "high" },
  { id: "poetry-page", kind: "poetry", name: "Poetry Page", description: "Restrained single-column composition with generous negative space.", recommendedColumns: 1, imageEmphasis: "low", textDensity: "low" },
  { id: "photo-story", kind: "photo-essay", name: "Photo Essay", description: "Image-forward sequence with concise captions and flexible pacing.", recommendedColumns: 1, imageEmphasis: "high", textDensity: "low" },
  { id: "contributor-profile", kind: "profile", name: "Contributor Profile", description: "Portrait, biography and selected highlights in a compact profile system.", recommendedColumns: 2, imageEmphasis: "medium", textDensity: "medium" },
  { id: "sponsor-page", kind: "advertisement", name: "Sponsor Page", description: "Full-page sponsor or advertisement layout with safe-area awareness.", recommendedColumns: 1, imageEmphasis: "high", textDensity: "low" },
  { id: "back-page", kind: "closing", name: "Closing Page", description: "Simple closing statement, colophon or back-page visual.", recommendedColumns: 1, imageEmphasis: "medium", textDensity: "low" },
];

export const coverTemplates = magazineLayoutRecipes.filter((recipe) => recipe.kind === "cover");

export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
  xxl: 48,
} as const;

export const pageDimensionsMm: Record<ProductionSettings["pageSize"], { width: number; height: number } | null> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  "US Letter": { width: 215.9, height: 279.4 },
  "Square 210": { width: 210, height: 210 },
  Custom: null,
};

export function defaultPaletteForTheme(theme: ThemeKey): IssuePalette {
  const tokens = themeTokens[theme];
  return {
    source: "theme",
    primary: tokens.accent,
    secondary: tokens.ink,
    background: tokens.paper,
    ink: tokens.ink,
    muted: "#7c7a76",
  };
}

export function resolveIssuePalette(issue: Issue): IssuePalette {
  return issue.palette ?? defaultPaletteForTheme(issue.theme);
}

export function resolveProductionSettings(issue: Issue): ProductionSettings {
  return issue.production ?? defaultProductionSettings;
}

export function resolveCoverDesign(issue: Issue): CoverDesign {
  const firstStory = issue.articles[0];
  const cover = issue.cover;
  return {
    mode: cover?.mode ?? (issue.coverImageUrl ? "imported" : "generated"),
    templateId: cover?.templateId ?? "cover-editorial",
    masthead: cover?.masthead ?? "LEXOZINE",
    mainHeadline: cover?.mainHeadline ?? firstStory?.title ?? issue.title,
    deck: cover?.deck ?? issue.description,
    lines: cover?.lines ?? issue.coverLines,
    textAlign: cover?.textAlign ?? "left",
    heroImageUrl: cover?.heroImageUrl ?? issue.coverImageUrl,
    heroImagePublicId: cover?.heroImagePublicId ?? issue.coverImagePublicId,
    heroFit: cover?.heroFit ?? "cover",
    heroFocalX: cover?.heroFocalX ?? 50,
    heroFocalY: cover?.heroFocalY ?? 50,
    overlay: cover?.overlay ?? { type: "gradient", color: "#000000", opacity: 0.62 },
    assets: cover?.assets ?? [],
    activeAssetId: cover?.activeAssetId,
  };
}

export function resolveActiveCoverAsset(issue: Issue) {
  const cover = resolveCoverDesign(issue);
  if (!cover.activeAssetId) return undefined;
  return cover.assets.find((asset) => asset.id === cover.activeAssetId);
}

export function resolveCoverImageUrl(issue: Issue) {
  const cover = resolveCoverDesign(issue);
  const activeAsset = resolveActiveCoverAsset(issue);
  return activeAsset?.url ?? cover.heroImageUrl ?? issue.coverImageUrl;
}

export function resolveCoverAspectRatio(issue: Issue, kind: "front" | "wrap" = "front") {
  const production = resolveProductionSettings(issue);
  const dimensions = pageDimensionsMm[production.pageSize] ?? { width: 210, height: 297 };
  const width = production.orientation === "landscape" ? dimensions.height : dimensions.width;
  const height = production.orientation === "landscape" ? dimensions.width : dimensions.height;
  return kind === "wrap" ? (width * 2) / height : width / height;
}
