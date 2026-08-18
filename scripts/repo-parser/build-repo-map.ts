import { collectTrackedFiles, readFileSafe, isSourceFile } from "./collect-files.ts";
import { parseEntrypoint } from "./parse-entrypoint.ts";
import { parseFeatures } from "./parse-feature.ts";
import { parseApiRoutes } from "./parse-api-route.ts";
import { parseEnvUsage } from "./parse-env.ts";
import type { RepoMap } from "./types.ts";

const CONFIG_FILES = new Set([
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
]);

const isRootEntrypoint = (relPath: string): boolean =>
  !relPath.includes("/") &&
  /\.ts$/.test(relPath) &&
  !CONFIG_FILES.has(relPath);

const isScriptEntrypoint = (relPath: string): boolean =>
  /^scripts\/[^/]+\.(ts|mjs|js)$/.test(relPath) ||
  /^scripts\/[^/]+\/index\.ts$/.test(relPath);

const readPackageJson = (root: string) => {
  try {
    return JSON.parse(readFileSafe(root, "package.json"));
  } catch {
    return {};
  }
};

export const buildRepoMap = (root: string): RepoMap => {
  const files = collectTrackedFiles(root);
  const readSource = (relPath: string) => readFileSafe(root, relPath);

  const entrypoints = [
    ...files.filter(isRootEntrypoint).map((file) =>
      parseEntrypoint(file, readSource(file), "root" as const)
    ),
    ...files.filter(isScriptEntrypoint).map((file) =>
      parseEntrypoint(file, readSource(file), "scripts" as const)
    ),
  ].sort((a, b) => a.path.localeCompare(b.path));

  const features = parseFeatures(files, readSource);
  const apiRoutes = parseApiRoutes(files, readSource);
  const env = parseEnvUsage(files.filter(isSourceFile), readSource);
  const pkg = readPackageJson(root);

  return {
    name: pkg.name ?? "unknown",
    generatedBy: "scripts/repo-parser",
    packageManager: pkg.packageManager ?? "pnpm",
    runtime: `node >=22 (native TypeScript execution)`,
    packageScripts: pkg.scripts ?? {},
    dependencies: pkg.dependencies ?? {},
    entrypoints,
    features,
    apiRoutes,
    env,
    docs: files.filter((file) => file.startsWith("docs/")).sort(),
    stats: {
      trackedFiles: files.length,
      entrypoints: entrypoints.length,
      features: features.length,
      apiRoutes: apiRoutes.length,
      envKeys: env.length,
      filesWithSecrets: entrypoints.filter((e) => e.secrets.length > 0).length,
      filesWithHighSeverity: entrypoints.filter((e) =>
        e.secrets.some((hit) => hit.severity === "high")
      ).length,
    },
  };
};
