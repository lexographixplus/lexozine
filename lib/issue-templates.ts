import { Article, Issue, StoryBlock, createId, defaultImagePlacement, defaultProductionSettings, defaultTypographySettings, typographyPresets } from "./editor-model";
import { setEditorsNoteArticleId } from "./editors-note";
import { defaultPaletteForTheme } from "./magazine-design";

function block(type: StoryBlock["type"], content: string, order: number): StoryBlock {
  return { id: createId("block"), type, content, order };
}

type StoryKit = {
  title: string;
  category: string;
  layout: Article["layout"];
  columns: 1 | 2 | 3;
  readTime: string;
  deck: string;
  imageAlt: string;
  imageCaption: string;
  pullquote: string;
  sidebar: string;
};

function storyBlock(type: StoryBlock["type"], content: string, order: number, span: 1 | 2 | 3, textStyle?: "subheading"): StoryBlock {
  return { ...block(type, content, order), layout: { hidden: false, span, locked: false, ...(textStyle ? { textStyle } : {}) } };
}

function imageSlot(kit: StoryKit, order: number): StoryBlock {
  return {
    ...block("image", "", order),
    placement: { ...defaultImagePlacement, alt: kit.imageAlt, caption: kit.imageCaption },
    layout: { hidden: false, span: kit.layout === "visual" ? kit.columns : Math.min(2, kit.columns) as 1 | 2 | 3, locked: false },
  };
}

function article(kit: StoryKit, theme: Article["theme"]): Article {
  const now = new Date().toISOString();
  const full = kit.columns;
  const bodySpan = 1 as const;
  const imageFirst = kit.layout === "visual";
  const blocks = imageFirst
    ? [
        storyBlock("headline", kit.title, 0, full),
        storyBlock("deck", kit.deck, 1, full),
        imageSlot(kit, 2),
        storyBlock("caption", kit.imageCaption, 3, full),
        storyBlock("body", "Replace this short opening with the first passage, scene, reflection or reporting note. The visual kit keeps space for photography while letting the text carry a clear editorial point of view.", 4, bodySpan),
        storyBlock("pullquote", kit.pullquote, 5, bodySpan),
        storyBlock("sidebar", kit.sidebar, 6, bodySpan),
      ]
    : [
        storyBlock("headline", kit.title, 0, full),
        storyBlock("deck", kit.deck, 1, full),
        imageSlot(kit, 2),
        storyBlock("body", "Replace this starter passage with the opening of the story. Keep the strongest scene, argument or observation near the beginning so readers understand why this piece matters.", 3, bodySpan),
        storyBlock("pullquote", kit.pullquote, 4, bodySpan),
        storyBlock("body", "Continue with the reporting, reflection or conversation here. Use the block controls to add a subheading, shift the order or place more imagery as the story develops.", 5, bodySpan),
        storyBlock("sidebar", kit.sidebar, 6, bodySpan),
        storyBlock("caption", kit.imageCaption, 7, Math.min(2, kit.columns) as 1 | 2 | 3),
      ];
  return {
    id: createId("article"),
    title: kit.title,
    slug: kit.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    category: kit.category,
    byline: "Lexozine Editorial",
    readTime: kit.readTime,
    layout: kit.layout,
    columns: kit.columns,
    theme,
    blocks,
    createdAt: now,
    updatedAt: now,
  };
}

const visualStoryKits: Record<IssueTemplateKind, StoryKit[]> = {
  literary: [
    { title: "The Rooms We Carry", category: "Essay", layout: "essay", columns: 2, readTime: "8 min read", deck: "A long-form essay kit for memory, place and interior life.", imageAlt: "A quiet interior or place central to the essay", imageCaption: "Add a considered image that extends the essay's sense of place.", pullquote: "The rooms that stay with us are often the ones we carry inside.", sidebar: "Context note: add a short editorial note, source, date or related reading." },
    { title: "The Work of Remembering", category: "Poetry", layout: "essay", columns: 1, readTime: "5 min read", deck: "A text-led poetry or short-form literary composition with generous pace.", imageAlt: "Optional quiet image or textured detail for the poem", imageCaption: "Optional image caption or source note.", pullquote: "Let the line breaks and silences do their work.", sidebar: "Contributor note: add a short bio, dedication or publication history." },
    { title: "A Conversation in Process", category: "Interview", layout: "interview", columns: 2, readTime: "7 min read", deck: "A portrait-led conversation for makers, writers and cultural practitioners.", imageAlt: "Portrait of the interview subject", imageCaption: "Add a portrait with clear alt text and photographer credit.", pullquote: "A good conversation leaves room for uncertainty as well as answers.", sidebar: "Conversation details: add the participant, location, date and editor's note." },
  ],
  youth: [
    { title: "After the Noise", category: "Feature", layout: "feature", columns: 2, readTime: "7 min read", deck: "A bold feature kit for voices, movement and the ideas shaping now.", imageAlt: "Dynamic editorial image for the feature", imageCaption: "Add an image with energy, context and a clear credit.", pullquote: "The next culture is being made in public, in real time.", sidebar: "Fast facts: add names, places, links or a concise editor's takeaway." },
    { title: "Making It Visible", category: "Photo Essay", layout: "visual", columns: 1, readTime: "4 min read", deck: "An image-led sequence for fashion, art, performance and visual culture.", imageAlt: "Lead photograph for a visual culture story", imageCaption: "Add a caption that names the moment, maker and place.", pullquote: "Images can hold a conversation before the first paragraph begins.", sidebar: "Photo notes: add photographer credit, series title or production details." },
    { title: "The New Creative Class", category: "Profile", layout: "feature", columns: 2, readTime: "6 min read", deck: "A profile kit for a person, collective or project making an impact.", imageAlt: "Portrait or workspace of the featured creative", imageCaption: "Add a portrait, workspace or process image.", pullquote: "New work needs new rooms, new tools and new ways of being seen.", sidebar: "Profile card: add social links, location, discipline and current project." },
  ],
  partner: [
    { title: "A Shared Future", category: "Impact Story", layout: "feature", columns: 2, readTime: "7 min read", deck: "A people-centred feature for partnerships, programmes and work in progress.", imageAlt: "People participating in the featured programme or project", imageCaption: "Add an image that shows the work in context, with consent and credit.", pullquote: "Progress becomes meaningful when the people closest to it can recognise themselves in the story.", sidebar: "Impact snapshot: add location, period, partners and one clear outcome." },
    { title: "Field Notes on Progress", category: "Case Study", layout: "essay", columns: 2, readTime: "6 min read", deck: "A structured case-study kit for learning, evidence and practical reflection.", imageAlt: "On-the-ground photograph connected to the case study", imageCaption: "Add a contextual image, diagram or field photograph.", pullquote: "Good evidence makes the next decision easier to see.", sidebar: "Case study summary: add challenge, response, evidence and next step." },
    { title: "The People Behind the Work", category: "Interview", layout: "interview", columns: 2, readTime: "6 min read", deck: "A conversational profile for the people who make shared work possible.", imageAlt: "Portrait of the featured contributor or team member", imageCaption: "Add a portrait with a clear credit and accessible description.", pullquote: "Every programme has a human story at its centre.", sidebar: "Contributor card: add role, organisation, location and relevant links." },
  ],
  editorial: [
    { title: "The City After Rain", category: "Feature", layout: "feature", columns: 2, readTime: "8 min read", deck: "A long-form editorial feature for ideas, people and place.", imageAlt: "Lead editorial image for the feature", imageCaption: "Add a lead image and concise credit.", pullquote: "Strong editorial systems make the content easier to shape without making every page look the same.", sidebar: "Add a related note, source or essential context." },
    { title: "New African Forms", category: "Essay", layout: "essay", columns: 2, readTime: "6 min read", deck: "A considered text-led essay with image and pull-quote rhythm.", imageAlt: "Supporting editorial image for the essay", imageCaption: "Add a supporting image or illustration.", pullquote: "The work becomes clearer when form follows the point of view.", sidebar: "Add references, contributor information or a reading list." },
    { title: "The Working Studio", category: "Interview", layout: "interview", columns: 2, readTime: "6 min read", deck: "A portrait-led conversation with room for ideas and process.", imageAlt: "Portrait of the interview subject", imageCaption: "Add a portrait and photographer credit.", pullquote: "Process is where the strongest ideas start to show themselves.", sidebar: "Add participant details and a short editorial introduction." },
  ],
  culture: [
    { title: "The Shape of Memory", category: "Feature", layout: "feature", columns: 2, readTime: "8 min read", deck: "A culture-forward feature with a clear visual opening.", imageAlt: "Lead image for a cultural feature", imageCaption: "Add a context-rich lead image.", pullquote: "Memory is not static; it changes shape with every telling.", sidebar: "Add cultural context, source information or an editor's note." },
    { title: "Living Archives", category: "Photo Essay", layout: "visual", columns: 1, readTime: "5 min read", deck: "An image-first cultural story with captions and a concise text passage.", imageAlt: "Lead image for the photo essay", imageCaption: "Add a caption that grounds the image in place and time.", pullquote: "An archive can be a room, a voice, a body or a photograph.", sidebar: "Add image credits, collection information or further reading." },
    { title: "The Working Studio", category: "Profile", layout: "interview", columns: 2, readTime: "6 min read", deck: "A profile of a creative person, studio or collective.", imageAlt: "Portrait or working environment of the creative subject", imageCaption: "Add a portrait or studio image.", pullquote: "Culture grows through the patient work of people who keep making.", sidebar: "Add profile links, location and current work." },
  ],
  minimal: [
    { title: "Quiet Forms", category: "Essay", layout: "essay", columns: 2, readTime: "7 min read", deck: "A restrained essay structure for close reading and thoughtful analysis.", imageAlt: "Subtle supporting image for a minimal essay", imageCaption: "Add a restrained image or illustration.", pullquote: "Clarity has its own kind of atmosphere.", sidebar: "Add a compact reading note or source reference." },
    { title: "A Quiet Practice", category: "Profile", layout: "feature", columns: 2, readTime: "6 min read", deck: "A concise profile for work, practice and process.", imageAlt: "Portrait or process image for the profile", imageCaption: "Add a simple, well-composed portrait or process image.", pullquote: "The smallest practices often reveal the most durable ideas.", sidebar: "Add role, location and a small set of essential links." },
    { title: "The Working Studio", category: "Interview", layout: "interview", columns: 2, readTime: "6 min read", deck: "A clean conversation structure with portrait and context notes.", imageAlt: "Portrait of the interview subject", imageCaption: "Add a portrait with appropriate credit.", pullquote: "What looks simple is often the result of careful attention.", sidebar: "Add participant details, date and editorial context." },
  ],
};

function editorsNoteArticle(theme: Article["theme"]): Article {
  const now = new Date().toISOString();
  return {
    id: createId("article"),
    title: "Editor's Note",
    slug: "editors-note",
    category: "Editorial",
    byline: "Lexozine Editorial",
    readTime: "3 min read",
    layout: "essay",
    columns: 1,
    theme,
    blocks: [
      block("headline", "A note from the editor", 0),
      block("deck", "Every issue begins with a point of view — a short invitation into the stories, people and ideas that follow.", 1),
      block("body", "Welcome to this sample Lexozine edition. This opening note is a real editable article, not issue metadata. In your own publication, use this space to introduce the issue, frame its theme and speak directly to readers before they move into the main editorial sequence.", 2),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankIssue(): Issue {
  const now = new Date().toISOString();
  return {
    id: createId("issue"),
    title: "Untitled Issue",
    number: "01",
    editionDate: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date()),
    status: "draft",
    visibility: "private",
    description: "",
    theme: "editorial",
    coverLines: [],
    palette: defaultPaletteForTheme("editorial"),
    pages: [],
    articles: [],
    production: { ...defaultProductionSettings },
    typography: { ...defaultTypographySettings },
    createdAt: now,
    updatedAt: now,
  };
}

export type IssueTemplateKind = "editorial" | "culture" | "minimal" | "literary" | "youth" | "partner";

export function createIssueTemplate(kind: IssueTemplateKind = "literary"): Issue {
  const now = new Date().toISOString();
  const isLiterary = kind === "literary";
  const isYouth = kind === "youth";
  const isPartner = kind === "partner";
  const theme = kind === "culture" || isYouth ? "cultural" : kind === "minimal" || isPartner ? "minimal" : "editorial";
  const editorsNote = editorsNoteArticle(theme);
  const featureArticles = visualStoryKits[kind].map((kit) => article(kit, theme));
  const articles = [editorsNote, ...featureArticles];
  const title = isLiterary ? "Margins & Memory" : isYouth ? "The New Current" : isPartner ? "Common Ground" : kind === "culture" ? "Living Archives" : kind === "minimal" ? "Quiet Forms" : "New Voices";
  const coverLines = isYouth
    ? ["New voices, real ideas, no borrowed language", "Culture in motion across a changing generation", "Artists, builders and the work in between"]
    : isPartner
      ? ["People, ideas and progress in practice", "A shared record of work worth carrying forward", "Partnership, insight and impact"]
      : ["Designing the next African visual language", "Culture, publishing and creative technology", "Independent voices worth reading"];
  const typography = isYouth
    ? { preset: "hybrid" as const, ...typographyPresets.hybrid }
    : isPartner
      ? { preset: "minimal" as const, ...typographyPresets.minimal }
      : { ...defaultTypographySettings };
  const palette = isYouth
    ? { source: "custom" as const, primary: "#eb4c2f", secondary: "#171a1d", background: "#f7efe5", ink: "#171a1d", muted: "#746b63" }
    : isPartner
      ? { source: "custom" as const, primary: "#1b5fbf", secondary: "#18253a", background: "#f4f7fb", ink: "#172033", muted: "#667085" }
      : defaultPaletteForTheme(theme);

  const issue: Issue = {
    id: createId("issue"),
    title,
    number: "01",
    editionDate: new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date()),
    status: "draft",
    visibility: "private",
    description: isLiterary ? "A literary issue for stories, ideas and the work of remembering." : isYouth ? "A culture-forward issue for the people shaping what comes next." : isPartner ? "A considered publication for shared work, ideas and impact." : "A modern editorial issue created in Lexozine Studio.",
    theme,
    coverLines,
    cover: {
      mode: "generated",
      templateId: isYouth ? "cover-culture" : isPartner ? "cover-minimal" : "cover-editorial",
      masthead: "LEXOZINE",
      mainHeadline: featureArticles[0]?.title ?? title,
      deck: isLiterary ? "Writing, culture and interior lives." : isYouth ? "Ideas, people and culture in motion." : isPartner ? "A publication shaped around people and progress." : "A modern editorial issue created in Lexozine Studio.",
      lines: coverLines,
      textAlign: "left",
      heroFit: "cover",
      heroFocalX: 50,
      heroFocalY: 50,
      overlay: { type: "gradient", color: "#000000", opacity: 0.62 },
      assets: [],
    },
    palette,
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
    typography,
    createdAt: now,
    updatedAt: now,
  };

  return setEditorsNoteArticleId(issue, editorsNote.id);
}

export const templateCatalog: Array<{ id: IssueTemplateKind; name: string; description: string }> = [
  { id: "literary", name: "Literary Journal", description: "Essay, poetry and interview kits for fiction, criticism and cultural writing." },
  { id: "youth", name: "Youth Culture", description: "Feature, photo essay and profile kits for new voices and creative work." },
  { id: "partner", name: "Partner Edition", description: "Impact story, case study and profile kits for programmes and collaborations." },
];
