import { Article, Issue, StoryBlock, createId, defaultProductionSettings, defaultTypographySettings } from "./editor-model";
import { defaultPaletteForTheme } from "./magazine-design";

function block(type: StoryBlock["type"], content: string, order: number): StoryBlock {
  return { id: createId("block"), type, content, order };
}

function article(title: string, layout: Article["layout"], theme: Article["theme"], index: number): Article {
  const now = new Date().toISOString();
  return {
    id: createId("article"),
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    category: index % 2 === 0 ? "Design / Culture" : "Ideas / People",
    byline: "Lexozine Editorial",
    readTime: index % 2 === 0 ? "8 min read" : "6 min read",
    layout,
    columns: layout === "visual" ? 1 : 2,
    theme,
    blocks: [
      block("headline", title, 0),
      block("deck", "A considered editorial introduction that can be replaced with imported manuscript content.", 1),
      block("body", "This template provides a structured starting point for a professional magazine story. Content remains editable and can be retagged after import.", 2),
      block("pullquote", "Strong editorial systems make the content easier to shape without making every page look the same.", 3),
      block("body", "Use the inspector to refine typography, columns, emphasis and media treatment while keeping the issue visually coherent.", 4),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function createIssueTemplate(kind: "editorial" | "culture" | "minimal" = "editorial"): Issue {
  const now = new Date().toISOString();
  const theme = kind === "culture" ? "cultural" : kind === "minimal" ? "minimal" : "editorial";
  const articles = [
    article(kind === "culture" ? "The Shape of Memory" : "The City After Rain", "feature", theme, 0),
    article(kind === "minimal" ? "A Quiet Practice" : "New African Forms", "essay", theme, 1),
    article("The Working Studio", "interview", theme, 2),
  ];
  const title = kind === "culture" ? "Living Archives" : kind === "minimal" ? "Quiet Forms" : "New Voices";
  const coverLines = [
    "Designing the next African visual language",
    "Culture, publishing and creative technology",
    "Independent voices worth reading",
  ];

  return {
    id: createId("issue"),
    title,
    number: "01",
    editionDate: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date()),
    status: "draft",
    visibility: "private",
    description: "A modern editorial issue created in Lexozine Studio.",
    theme,
    coverLines,
    cover: {
      mode: "generated",
      templateId: "cover-editorial",
      masthead: "LEXOZINE",
      mainHeadline: articles[0]?.title ?? title,
      deck: "A modern editorial issue created in Lexozine Studio.",
      lines: coverLines,
      textAlign: "left",
      heroFit: "cover",
      heroFocalX: 50,
      heroFocalY: 50,
      overlay: { type: "gradient", color: "#000000", opacity: 0.62 },
      assets: [],
    },
    palette: defaultPaletteForTheme(theme),
    pages: [
      { id: createId("page"), label: "Cover", kind: "cover", order: 0 },
      { id: createId("page"), label: "Contents", kind: "toc", order: 1 },
      ...articles.map((item, index) => ({
        id: createId("page"),
        label: item.title,
        kind: "article" as const,
        articleId: item.id,
        order: index + 2,
      })),
    ],
    articles,
    production: { ...defaultProductionSettings },
    typography: { ...defaultTypographySettings },
    createdAt: now,
    updatedAt: now,
  };
}

export const templateCatalog = [
  { id: "editorial" as const, name: "Editorial Journal", description: "High-contrast feature stories, strong display type and classic magazine rhythm." },
  { id: "culture" as const, name: "Culture Review", description: "Warm, expressive layouts for arts, literature, people and cultural reporting." },
  { id: "minimal" as const, name: "Minimal Digest", description: "Quiet typography, generous white space and restrained visual hierarchy." },
];
