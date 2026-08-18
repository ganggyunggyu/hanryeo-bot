import path from "node:path";
import type { Feature, FeatureSegment } from "./types.ts";

const NAMED_EXPORT =
  /^\s*export\s+(?:declare\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm;
const EXPORT_LIST = /^\s*export\s*\{([^}]+)\}/gm;
const RE_EXPORT = /^\s*export\s+\*\s+from\s+["']([^"']+)["']/gm;

const collectMatches = (source: string, pattern: RegExp): string[] => {
  pattern.lastIndex = 0;
  const found: string[] = [];
  let match = pattern.exec(source);

  while (match !== null) {
    found.push(match[1]);
    match = pattern.exec(source);
  }

  return found;
};

export const extractExports = (source: string): string[] => {
  const named = collectMatches(source, NAMED_EXPORT);

  const listed = collectMatches(source, EXPORT_LIST).flatMap((body) =>
    body
      .split(",")
      .map((item) => item.split(/\s+as\s+/).pop()?.trim() ?? "")
      .filter((item) => item && item !== "type")
  );

  return [...new Set([...named, ...listed])].sort();
};

export const parseFeatures = (
  files: string[],
  readSource: (relPath: string) => string
): Feature[] => {
  const featureFiles = files.filter((file) =>
    file.startsWith("src/features/")
  );
  const byFeature = new Map<string, string[]>();

  for (const file of featureFiles) {
    const [, , name] = file.split("/");
    if (!name) continue;

    const bucket = byFeature.get(name) ?? [];
    bucket.push(file);
    byFeature.set(name, bucket);
  }

  return [...byFeature.entries()]
    .map(([name, ownedFiles]) => {
      const bySegment = new Map<string, string[]>();

      for (const file of ownedFiles) {
        const parts = file.split("/");
        const segment = parts.length > 4 ? parts[3] : "root";
        const bucket = bySegment.get(segment) ?? [];
        bucket.push(file);
        bySegment.set(segment, bucket);
      }

      const segments: FeatureSegment[] = [...bySegment.entries()]
        .filter(([segment]) => segment !== "root")
        .map(([segment, segmentFiles]) => ({
          name: segment,
          files: segmentFiles.sort(),
          exports: [
            ...new Set(
              segmentFiles
                .filter((file) => path.basename(file) !== "index.ts")
                .flatMap((file) => extractExports(readSource(file)))
            ),
          ].sort(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const barrel = readSource(`src/features/${name}/index.ts`);

      return {
        name,
        segments,
        publicApi: collectMatches(barrel, RE_EXPORT).sort(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};
