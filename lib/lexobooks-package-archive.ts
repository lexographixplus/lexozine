import { inflateRawSync } from "node:zlib";
import { parseLexoBooksEdition } from "./lexobooks-edition";
import type { LexoBooksEdition } from "./editor-model";

const ZIP_END = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_LOCAL = 0x04034b50;
const MAX_FILES = 1_000;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

type ArchiveFile = { path: string; data: Buffer };

export type LexoBooksPackage = {
  edition: LexoBooksEdition;
  pages: Array<{ number: number; label: string; svgPath: string; svg: string }>;
  assets: ArchiveFile[];
  warnings: string[];
};

function safePath(value: string) {
  const path = value.replaceAll("\\", "/");
  if (!path || path.endsWith("/") || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return path;
}

function endOfCentralDirectory(input: Buffer) {
  const start = Math.max(0, input.length - 65_557);
  for (let offset = input.length - 22; offset >= start; offset -= 1) {
    if (input.readUInt32LE(offset) === ZIP_END) return offset;
  }
  throw new Error("The archive has no ZIP directory");
}

function unzip(input: Buffer): ArchiveFile[] {
  if (input.length < 22) throw new Error("The package is not a ZIP archive");
  const end = endOfCentralDirectory(input);
  const count = input.readUInt16LE(end + 10);
  const centralOffset = input.readUInt32LE(end + 16);
  if (!count || count > MAX_FILES) throw new Error("The package has an unsupported number of files");

  const files: ArchiveFile[] = [];
  let cursor = centralOffset;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > input.length || input.readUInt32LE(cursor) !== ZIP_CENTRAL) throw new Error("The ZIP directory is malformed");
    const flags = input.readUInt16LE(cursor + 8);
    const method = input.readUInt16LE(cursor + 10);
    const compressedSize = input.readUInt32LE(cursor + 20);
    const uncompressedSize = input.readUInt32LE(cursor + 24);
    const nameLength = input.readUInt16LE(cursor + 28);
    const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32);
    const localOffset = input.readUInt32LE(cursor + 42);
    if (flags & 0x1) throw new Error("Encrypted LexoBooks packages are not supported");
    if (uncompressedSize > MAX_UNCOMPRESSED_BYTES || total + uncompressedSize > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("The package is too large after extraction");
    }

    const name = safePath(input.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8"));
    if (localOffset + 30 > input.length || input.readUInt32LE(localOffset) !== ZIP_LOCAL) throw new Error(`Archive entry ${name} is malformed`);
    const localNameLength = input.readUInt16LE(localOffset + 26);
    const localExtraLength = input.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > input.length) throw new Error(`Archive entry ${name} is truncated`);
    const compressed = input.subarray(dataStart, dataEnd);
    const data = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
    if (!data || data.length !== uncompressedSize) throw new Error(`Archive entry ${name} uses an unsupported compression method`);

    files.push({ path: name, data });
    total += data.length;
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validSvg(svg: string, path: string) {
  if (!svg.trimStart().startsWith("<svg") || /<(script|iframe|object|embed|foreignObject)\b|\son\w+\s*=/i.test(svg)) {
    throw new Error(`${path} is not a safe SVG page`);
  }
}

export function readLexoBooksPackage(input: Buffer): LexoBooksPackage {
  const files = unzip(input);
  const fileMap = new Map(files.map((file) => [file.path, file]));
  const manifestFile = fileMap.get("manifest.json");
  if (!manifestFile) throw new Error("The package does not contain manifest.json");

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(manifestFile.data.toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new Error("manifest.json is not valid JSON");
  }
  if (manifest.format !== "lexobooks-edition-package" || manifest.version !== 1) {
    throw new Error("This is not a supported LexoBooks edition package");
  }

  const sourceEdition = record(manifest.edition);
  if (!sourceEdition || !Array.isArray(sourceEdition.pages)) {
    throw new Error("The package has no LexoBooks edition manifest");
  }
  const pages = sourceEdition.pages.map((value, index) => {
    const page = record(value);
    if (!page || typeof page.svgPath !== "string") throw new Error(`edition.pages[${index}] has no SVG path`);
    const svgPath = safePath(page.svgPath);
    const svg = fileMap.get(svgPath)?.data.toString("utf8");
    if (!svg) throw new Error(`The package is missing ${svgPath}`);
    validSvg(svg, svgPath);
    return {
      number: page.number,
      label: page.label,
      svgPath,
      svg,
    };
  });

  // Validate the release metadata before any files are uploaded. Temporary
  // paths are replaced by persistent CDN URLs in the import route.
  const provisional = parseLexoBooksEdition({
    ...sourceEdition,
    pages: pages.map((page, index) => ({
      number: page.number,
      label: page.label,
      svgUrl: `/lexobooks-package-preview/${index + 1}.svg`,
    })),
  });

  return {
    edition: provisional,
    pages: pages.map((page, index) => ({
      number: provisional.pages[index].number,
      label: provisional.pages[index].label,
      svgPath: page.svgPath,
      svg: page.svg,
    })),
    assets: files.filter((file) => file.path.startsWith("assets/")),
    warnings: Array.isArray(manifest.warnings) ? manifest.warnings.filter((value): value is string => typeof value === "string") : [],
  };
}
