import type { BlockType, StoryBlock } from "./editor-model";
import { createId } from "./editor-model";
import { defaultLayoutSettings } from "./layout-composer";

const inlineAllowed = new Set(["B", "STRONG", "I", "EM", "U", "S", "BR", "SPAN", "SUP", "SUB", "A"]);
const bodyAllowed = new Set([...inlineAllowed, "P", "UL", "OL", "LI"]);

type MappedElement = {
  type: BlockType;
  textStyle?: "subheading";
};

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

function mappedContent(element: Element, type: BlockType) {
  const tag = element.tagName.toLowerCase();
  if (type === "body" && (tag === "ul" || tag === "ol")) return sanitizeNode(element, true).trim();
  if (type === "body" && tag === "pre") return escapeHtml(element.textContent ?? "").replace(/\r?\n/g, "<br>").trim();
  return innerContent(element, type === "body");
}

function makeBlock(mapped: MappedElement, content: string, order: number, columns: 1 | 2 | 3): StoryBlock {
  const defaults = defaultLayoutSettings(mapped.type, columns);
  return {
    id: createId("block"),
    type: mapped.type,
    content,
    order,
    layout: {
      ...defaults,
      ...(mapped.textStyle ? { textStyle: mapped.textStyle, span: columns } : {}),
    },
  };
}

function normalizedElementType(element: Element, headlineSeen: boolean): MappedElement | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "h1") return headlineSeen ? { type: "body", textStyle: "subheading" } : { type: "headline" };
  if (/^h[2-6]$/.test(tag)) return { type: "body", textStyle: "subheading" };
  if (tag === "blockquote") return { type: "pullquote" };
  if (tag === "figcaption") return { type: "caption" };
  if (element.classList.contains("lexo-deck") || element.classList.contains("subtitle")) return { type: "deck" };
  if (tag === "p" || tag === "ul" || tag === "ol" || tag === "pre") return { type: "body" };
  return null;
}

function flushParagraphRun(run: string[], blocks: StoryBlock[], columns: 1 | 2 | 3) {
  if (!run.length) return;
  const trimmed = [...run];
  while (trimmed[0] === "") trimmed.shift();
  while (trimmed.at(-1) === "") trimmed.pop();
  if (!trimmed.length) return;
  const content = trimmed.map((item) => item || "<br>").join("");
  if (content.replace(/<[^>]+>/g, "").trim()) blocks.push(makeBlock({ type: "body" }, content, blocks.length, columns));
}

export function blocksFromStructuredHtml(html: string, columns: 1 | 2 | 3): StoryBlock[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,iframe,object,embed").forEach((node) => node.remove());
  const blocks: StoryBlock[] = [];
  let headlineSeen = false;
  let paragraphRun: string[] = [];

  const flush = () => {
    flushParagraphRun(paragraphRun, blocks, columns);
    paragraphRun = [];
  };

  for (const element of Array.from(doc.body.children)) {
    const mapped = normalizedElementType(element, headlineSeen);
    if (!mapped) {
      flush();
      continue;
    }
    const tag = element.tagName.toLowerCase();
    const content = mappedContent(element, mapped.type);

    if (mapped.type === "body" && !mapped.textStyle && tag === "p") {
      if (!content || !content.replace(/<[^>]+>/g, "").trim()) paragraphRun.push("");
      else paragraphRun.push(`<p>${content}</p>`);
      continue;
    }

    flush();
    if (!content || !content.replace(/<[^>]+>/g, "").trim()) continue;
    blocks.push(makeBlock(mapped, content, blocks.length, columns));
    if (mapped.type === "headline") headlineSeen = true;
  }

  flush();
  return blocks;
}

function looksLikeVerse(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 4) return false;
  const averageLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const shortLines = lines.filter((line) => line.length <= 90).length;
  return averageLength <= 85 && shortLines / lines.length >= 0.7;
}

export function blocksFromPlainText(text: string, columns: 1 | 2 | 3): StoryBlock[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (looksLikeVerse(normalized)) {
    const lines = normalized.split("\n");
    const firstNonEmpty = lines.findIndex((line) => line.trim());
    const headline = firstNonEmpty >= 0 ? lines[firstNonEmpty].trim() : "";
    const bodyLines = lines.slice(firstNonEmpty + 1);
    while (!bodyLines[0]?.trim()) bodyLines.shift();
    while (bodyLines.length && !bodyLines.at(-1)?.trim()) bodyLines.pop();
    const body = bodyLines.map((line) => escapeHtml(line.trimEnd())).join("<br>");
    const result: StoryBlock[] = [];
    if (headline) result.push(makeBlock({ type: "headline" }, escapeHtml(headline), result.length, columns));
    if (body.replace(/<br>/g, "").trim()) result.push(makeBlock({ type: "body" }, body, result.length, columns));
    return result;
  }

  const parts = normalized
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
    return makeBlock({ type }, escapeHtml(content).replace(/\n/g, "<br>"), index, columns);
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
