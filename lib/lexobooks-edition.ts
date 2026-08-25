import type { FixedLayoutPage, LexoBooksEdition } from "./editor-model";

export const LEXOBOOKS_EDITION_FORMAT = "lexobooks-edition";
export const LEXOBOOKS_EDITION_VERSION = 1;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function nonEmpty(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function number(value: unknown, label: string, minimum = 0) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= minimum) {
    throw new Error(`${label} must be a number greater than ${minimum}`);
  }
  return value;
}

function assetUrl(value: unknown, label: string) {
  const url = nonEmpty(value, label);
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    // The validation error below is clearer than the URL parser error.
  }
  throw new Error(`${label} must be an absolute HTTP(S) URL or an application path`);
}

function optionalAssetUrl(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return assetUrl(value, label);
}

/**
 * Validates the portable manifest emitted by LexoBooks. Page artwork remains
 * outside the database; the manifest carries immutable asset URLs only.
 */
export function parseLexoBooksEdition(input: unknown): LexoBooksEdition {
  const manifest = record(input);
  if (!manifest) throw new Error("The LexoBooks edition must be a JSON object");
  if (manifest.format !== LEXOBOOKS_EDITION_FORMAT) {
    throw new Error(`Unsupported edition format. Expected ${LEXOBOOKS_EDITION_FORMAT}`);
  }
  if (manifest.version !== LEXOBOOKS_EDITION_VERSION) {
    throw new Error(`Unsupported LexoBooks edition version: ${String(manifest.version)}`);
  }

  const source = record(manifest.source);
  const geometry = record(manifest.page);
  if (!source || !geometry) throw new Error("The edition source and page geometry are required");

  const rawPages = manifest.pages;
  if (!Array.isArray(rawPages) || rawPages.length < 1 || rawPages.length > 500) {
    throw new Error("An edition must contain between 1 and 500 pages");
  }

  const pages = rawPages.map((value, index): FixedLayoutPage => {
    const page = record(value);
    if (!page) throw new Error(`pages[${index}] must be an object`);
    const pageNumber = number(page.number, `pages[${index}].number`);
    if (!Number.isInteger(pageNumber)) throw new Error(`pages[${index}].number must be an integer`);
    return {
      number: pageNumber,
      label: typeof page.label === "string" && page.label.trim() ? page.label.trim() : `Page ${pageNumber}`,
      svgUrl: assetUrl(page.svgUrl, `pages[${index}].svgUrl`),
      previewUrl: optionalAssetUrl(page.previewUrl, `pages[${index}].previewUrl`),
      text: typeof page.text === "string" ? page.text.slice(0, 200_000) : undefined,
    };
  }).sort((left, right) => left.number - right.number);

  if (new Set(pages.map((page) => page.number)).size !== pages.length) {
    throw new Error("Page numbers must be unique");
  }

  const unit = geometry.unit === "pt" || geometry.unit === "mm" ? geometry.unit : null;
  if (!unit) throw new Error("page.unit must be pt or mm");
  const direction = geometry.readingDirection === "rtl" ? "rtl" : "ltr";

  return {
    format: LEXOBOOKS_EDITION_FORMAT,
    version: LEXOBOOKS_EDITION_VERSION,
    buildId: typeof manifest.buildId === "string" && manifest.buildId.trim() ? manifest.buildId.trim() : crypto.randomUUID(),
    createdAt: typeof manifest.createdAt === "string" && manifest.createdAt.trim() ? manifest.createdAt : new Date().toISOString(),
    source: {
      projectId: nonEmpty(source.projectId, "source.projectId"),
      projectRevision: typeof source.projectRevision === "string" ? source.projectRevision : undefined,
      rendererVersion: typeof source.rendererVersion === "string" ? source.rendererVersion : undefined,
    },
    page: {
      width: number(geometry.width, "page.width"),
      height: number(geometry.height, "page.height"),
      unit,
      readingDirection: direction,
    },
    pages,
    pdfUrl: optionalAssetUrl(manifest.pdfUrl, "pdfUrl"),
  };
}
