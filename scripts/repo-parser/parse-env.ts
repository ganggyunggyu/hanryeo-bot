import type { EnvUsage } from "./types.ts";

const ENV_KEY = /process\.env\.([A-Z0-9_]+)/g;

export const parseEnvUsage = (
  files: string[],
  readSource: (relPath: string) => string
): EnvUsage[] => {
  const usage = new Map<string, Set<string>>();

  for (const file of files) {
    const source = readSource(file);
    ENV_KEY.lastIndex = 0;
    let match = ENV_KEY.exec(source);

    while (match !== null) {
      const key = match[1];
      const bucket = usage.get(key) ?? new Set<string>();
      bucket.add(file);
      usage.set(key, bucket);
      match = ENV_KEY.exec(source);
    }
  }

  return [...usage.entries()]
    .map(([key, files]) => ({ key, usedIn: [...files].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
};
