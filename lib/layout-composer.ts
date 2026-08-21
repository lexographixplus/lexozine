import type { Article, BlockType, LayoutBlockSettings, StoryBlock } from "./editor-model";
import { createId } from "./editor-model";

export type LayoutPresetDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  columns: 1 | 2 | 3;
  imageRatio: string;
  character: string;
  articleLayout: Article["layout"];
  order: BlockType[];
  spans: Partial<Record<BlockType, 1 | 2 | 3>>;
};

export const layoutPresets: LayoutPresetDefinition[] = [
  {
    id: "feature-opener",
    name: "Feature Opener",
    category: "Feature",
    description: "Large editorial headline, deck and dominant image for long-form story openings.",
    columns: 2,
    imageRatio: "3:2",
    character: "Expressive",
    articleLayout: "feature",
    order: ["headline", "deck", "image", "body", "pullquote", "sidebar", "caption"],
    spans: { headline: 2, deck: 2, image: 2, body: 1, pullquote: 1, sidebar: 1, caption: 2 },
  },
  {
    id: "classic-essay",
    name: "Classic Essay",
    category: "Essay",
    description: "Quiet text-led spread with generous margins and a pull-quote rhythm.",
    columns: 2,
    imageRatio: "4:3",
    character: "Literary",
    articleLayout: "essay",
    order: ["headline", "deck", "body", "pullquote", "body", "image", "caption", "sidebar"],
    spans: { headline: 2, deck: 2, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "poetry-page",
    name: "Poetry Page",
    category: "Poetry",
    description: "Single-column literary composition that protects line rhythm, stanza spacing and generous negative space.",
    columns: 1,
    imageRatio: "Optional",
    character: "Literary",
    articleLayout: "essay",
    order: ["headline", "deck", "body", "pullquote", "caption", "image", "sidebar"],
    spans: { headline: 1, deck: 1, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "interview",
    name: "Interview",
    category: "Interview",
    description: "Portrait-led Q&A system with strong speaker hierarchy and flexible side notes.",
    columns: 2,
    imageRatio: "4:5",
    character: "Conversational",
    articleLayout: "interview",
    order: ["headline", "deck", "image", "body", "pullquote", "body", "sidebar", "caption"],
    spans: { headline: 2, deck: 2, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "minimal-profile",
    name: "Contributor Profile",
    category: "Profile",
    description: "Single-subject profile with restrained typography, portrait space and a compact biography rhythm.",
    columns: 2,
    imageRatio: "2:3",
    character: "Personal",
    articleLayout: "feature",
    order: ["image", "headline", "deck", "body", "pullquote", "caption", "sidebar"],
    spans: { headline: 2, deck: 2, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "photo-story",
    name: "Photo Essay",
    category: "Photo Essay",
    description: "Image-first sequence with concise text, captions and flexible visual pacing.",
    columns: 1,
    imageRatio: "Flexible",
    character: "Visual",
    articleLayout: "visual",
    order: ["headline", "deck", "image", "caption", "image", "caption", "body", "pullquote", "sidebar"],
    spans: { headline: 1, deck: 1, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "editors-note",
    name: "Editor's Note",
    category: "Editorial",
    description: "Quiet opening article with a strong title, concise introduction and optional portrait or signature image.",
    columns: 1,
    imageRatio: "4:5",
    character: "Reflective",
    articleLayout: "essay",
    order: ["headline", "deck", "image", "body", "pullquote", "caption", "sidebar"],
    spans: { headline: 1, deck: 1, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "visual-report",
    name: "Visual Report",
    category: "Visual",
    description: "Image-forward modular grid for photography, captions and short editorial text.",
    columns: 3,
    imageRatio: "1:1",
    character: "Visual",
    articleLayout: "visual",
    order: ["headline", "deck", "image", "image", "caption", "body", "pullquote", "sidebar"],
    spans: { headline: 3, deck: 2, image: 2, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "dispatch",
    name: "Dispatch",
    category: "News",
    description: "Dense, efficient page system for briefs, sidebars and multi-item editorial packages.",
    columns: 3,
    imageRatio: "16:9",
    character: "Structured",
    articleLayout: "essay",
    order: ["headline", "deck", "body", "sidebar", "image", "body", "pullquote", "caption"],
    spans: { headline: 3, deck: 2, image: 2, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
  {
    id: "sponsor-page",
    name: "Advertisement / Sponsor",
    category: "Advertisement",
    description: "Full-page promotional composition with safe spacing for a dominant visual, headline and supporting copy.",
    columns: 1,
    imageRatio: "Full page",
    character: "Promotional",
    articleLayout: "visual",
    order: ["image", "headline", "deck", "body", "caption", "sidebar", "pullquote"],
    spans: { headline: 1, deck: 1, image: 1, body: 1, pullquote: 1, sidebar: 1, caption: 1 },
  },
];

export function defaultLayoutSettings(type: BlockType, columns: 1 | 2 | 3): LayoutBlockSettings {
  const full = columns;
  if (type === "headline" || type === "deck") return { hidden: false, span: full, locked: false };
  if (type === "image") return { hidden: false, span: Math.min(2, columns) as 1 | 2 | 3, locked: false };
  return { hidden: false, span: 1, locked: false };
}

export function clampLayoutSpan(span: number, columns: 1 | 2 | 3): 1 | 2 | 3 {
  return Math.max(1, Math.min(columns, span)) as 1 | 2 | 3;
}

export function normalizeArticleLayout(article: Article): Article {
  return {
    ...article,
    blocks: [...article.blocks]
      .sort((a, b) => a.order - b.order)
      .map((block, order) => ({
        ...block,
        order,
        layout: {
          ...defaultLayoutSettings(block.type, article.columns),
          ...(block.layout ?? {}),
          span: clampLayoutSpan(block.layout?.span ?? defaultLayoutSettings(block.type, article.columns).span, article.columns),
        },
      })),
  };
}

function typeRank(type: BlockType, recipe: BlockType[]) {
  const rank = recipe.indexOf(type);
  return rank < 0 ? recipe.length : rank;
}

export function applyLayoutPreset(article: Article, presetId: string): Article {
  const preset = layoutPresets.find((item) => item.id === presetId) ?? layoutPresets[0];
  const originalOrder = new Map(article.blocks.map((block, index) => [block.id, index]));
  const ordered = [...article.blocks].sort((a, b) => {
    const typeDiff = typeRank(a.type, preset.order) - typeRank(b.type, preset.order);
    return typeDiff || (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0);
  });
  return {
    ...article,
    category: preset.category,
    layout: preset.articleLayout,
    columns: preset.columns,
    blocks: ordered.map((block, order) => ({
      ...block,
      order,
      layout: {
        hidden: false,
        locked: false,
        span: clampLayoutSpan(preset.spans[block.type] ?? defaultLayoutSettings(block.type, preset.columns).span, preset.columns),
      },
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function patchBlockLayout(block: StoryBlock, columns: 1 | 2 | 3, patch: Partial<LayoutBlockSettings>): StoryBlock {
  const current = { ...defaultLayoutSettings(block.type, columns), ...(block.layout ?? {}) };
  return {
    ...block,
    layout: {
      ...current,
      ...patch,
      span: clampLayoutSpan(patch.span ?? current.span, columns),
    },
  };
}

export function moveLayoutBlock(blocks: StoryBlock[], blockId: string, direction: -1 | 1) {
  const ordered = [...blocks].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((block) => block.id === blockId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return ordered;
  if (ordered[index].layout?.locked) return ordered;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map((block, order) => ({ ...block, order }));
}

export function duplicateLayoutBlock(blocks: StoryBlock[], blockId: string) {
  const ordered = [...blocks].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((block) => block.id === blockId);
  if (index < 0) return ordered;
  const source = ordered[index];
  const copy: StoryBlock = {
    ...structuredClone(source),
    id: createId("block"),
    order: index + 1,
    content: source.type === "image" ? source.content : `${source.content}`,
    layout: { ...defaultLayoutSettings(source.type, 3), ...(source.layout ?? {}), locked: false },
  };
  ordered.splice(index + 1, 0, copy);
  return ordered.map((block, order) => ({ ...block, order }));
}
