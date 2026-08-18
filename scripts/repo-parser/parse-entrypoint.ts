import { detectSecrets } from "./detect-secrets.ts";
import type { Entrypoint, EntrypointGroup } from "./types.ts";

const BLOCK_COMMENT = /^\s*\/\*\*?([\s\S]*?)\*\//;
const LINE_COMMENT_BLOCK = /^(?:\s*\/\/.*\n)+/;
const IMPORT_SOURCE = /^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm;
const BARE_IMPORT = /^\s*import\s+["']([^"']+)["']/gm;
const ENV_KEY = /process\.env\.([A-Z0-9_]+)/g;
const URL_LITERAL = /https?:\/\/([\w.-]+)/g;
const DATA_FILE = /["'`]([\w./가-힣-]+\.(?:json|tsv|csv|txt|md|webp|png|jpg))["'`]/g;

const stripCommentMarkers = (raw: string): string[] =>
  raw
    .split("\n")
    .map((line) => line.replace(/^\s*(\*|\/\/)\s?/, "").trimEnd())
    .map((line) => line.trim());

const extractHeaderComment = (source: string): string[] => {
  const block = BLOCK_COMMENT.exec(source);
  if (block) return stripCommentMarkers(block[1]);

  const lineBlock = LINE_COMMENT_BLOCK.exec(source);
  if (lineBlock) return stripCommentMarkers(lineBlock[0]);

  return [];
};

const splitHeader = (headerLines: string[]) => {
  const usageIndex = headerLines.findIndex((line) => /^usage:?/i.test(line));

  if (usageIndex === -1) {
    return { summary: headerLines.filter(Boolean).join(" "), usage: [] };
  }

  const summary = headerLines.slice(0, usageIndex).filter(Boolean).join(" ");
  const usage = headerLines
    .slice(usageIndex + 1)
    .map((line) => line.replace(/^usage:?\s*/i, ""))
    .filter(Boolean);

  return { summary, usage };
};

const matchAll = (source: string, pattern: RegExp, group = 1): string[] => {
  pattern.lastIndex = 0;
  const found = new Set<string>();
  let match = pattern.exec(source);

  while (match !== null) {
    const value = match[group];
    if (value) found.add(value);
    match = pattern.exec(source);
  }

  return [...found].sort();
};

const isInternal = (specifier: string): boolean =>
  specifier.startsWith(".") || specifier.startsWith("@/");

const normalizeSpecifier = (specifier: string): string =>
  specifier.replace(/^\.\//, "").replace(/\.ts$/, "");

export const parseEntrypoint = (
  relPath: string,
  source: string,
  group: EntrypointGroup
): Entrypoint => {
  const headerLines = extractHeaderComment(source);
  const { summary, usage } = splitHeader(headerLines);

  const specifiers = [
    ...matchAll(source, IMPORT_SOURCE),
    ...matchAll(source, BARE_IMPORT),
  ];

  const internalImports = specifiers
    .filter(isInternal)
    .map(normalizeSpecifier)
    .sort();

  const packageImports = specifiers
    .filter((specifier) => !isInternal(specifier))
    .sort();

  const hosts = matchAll(source, URL_LITERAL).filter(
    (host) => !host.endsWith("w3.org") && !host.endsWith("schema.org")
  );

  const dataFiles = matchAll(source, DATA_FILE).filter(
    (file) => !file.startsWith("http")
  );

  return {
    path: relPath,
    group,
    summary,
    usage,
    runCommand: `pnpm tsx ${relPath}`,
    internalImports,
    packageImports,
    envKeys: matchAll(source, ENV_KEY),
    dataFiles,
    hosts,
    secrets: detectSecrets(source),
    lines: source.split("\n").length,
  };
};
