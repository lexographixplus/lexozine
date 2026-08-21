import type { BlockType, StoryBlock } from "./editor-model";
import { createId } from "./editor-model";
import { defaultLayoutSettings } from "./layout-composer";

const inlineAllowed = new Set(["B", "STRONG", "I", "EM", "U", "S", "BR", "SPAN", "SUP", "SUB", "A"]);
const bodyAllowed = new Set([...inlineAllowed, "P", "UL", "OL", "LI"]);

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeNode(node: Node, allowBodyTags: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  const allowed = allowBodyTags ? bodyAllowed : inlineAllowed;
  if (!allowed.has(element.tagName)) return Array.from(element.childNodes).map((child) => sanitizeNode(child, allowBodyTags)).join("");
  const tag = element.tagName.toLowerCase();
  if (tag === "br") return "<br>";
  const children = Array.from(element.childNodes).map((child) => sanitizeNode(child, allowBodyTags)).join("");
  if (tag === "a") {
    const href = element.getAttribute("href");
    const safeHref = href && /^(https?:|mailto:)/i.test(href) ? ` href="${href.replace(/"/g, "&quot;")}"` : "";
    return `<a${safeHref}>${children}</a>`;
  }
  return `<${tag}>${children}</${tag}>`;
}

function innerContent(element: Element, allowBodyTags = false) {
  return Array.from(element.childNodes).map((node) => sanitizeNode(node, allowBodyTags)).join("").trim();
}

function makeBlock(type: BlockType, content: string, order: number, columns: 1 | 2 | 3): StoryBlock {
  return {
    id: createId("block"),
    type,
    content,
    order,
    layout: defaultLayoutSettings(type, columns),
  };
}

function normalizedElementType(element: Element, headlineSeen: boolean): BlockType | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "h1") return headlineSeen ? "subheading" : "headline";
  if (/^h[2-6]$/.test(tag)) return "subheading";
  if (tag === "blockquote") return "pullquote";
  if (tag === "figcaption") return "caption";
  if (element.classList.contains("lexo-deck") || element.classList.contains("subtitle")) return "deck";
  if (tag === "p" || tag === "ul" || tag === "ol" || tag === "pre") return "body";
  return null;
}

export function blocksFromStructuredHtml(html: string, columns: 1 | 2 | 3): StoryBlock[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,iframe,object,embed").forEach((node) => node.remove());
  const blocks: StoryBlock[] = [];
  let headlineSeen = false;

  for (const element of Array.from(doc.body.children)) {
    const type = normalizedElementType(element, headlineSeen);
    if (!type) continue;
    const allowBodyTags = type === "body";
    const content = innerContent(element, allowBodyTags);
    if (!content || !content.replace(/<[^>]+>/g, "").trim()) continue;
    blocks.push(makeBlock(type, content, blocks.length, columns));
    if (type === "headline") headlineSeen = true;
  }

  return blocks;
}

export function blocksFromPlainText(text: string, columns: 1 | 2 | 3): StoryBlock[] {
  const parts = text
    .replace(/\r/g, "")
    .split(/\n{2,}|\n(?=[A-Z][^\n]{0,100}$)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.map((content, index) => {
    const type: BlockType = index === 0
      ? "headline"
      : index === 1 && content.length < 220
        ? "deck"
        : content.length < 100 && index > 2
          ? "pullquote"
          : "body";
    return makeBlock(type, escapeHtml(content).replace(/\n/g, "<br>"), index, columns);
  });
}

export const mammothStyleMap = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p.lexo-deck:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
  "p[style-name='Caption'] => figcaption:fresh",
];
