import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "build",
  "coverage",
]);

const walkDir = (dir: string, root: string, acc: string[]): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
    if (IGNORED_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(full, root, acc);
      continue;
    }
    acc.push(path.relative(root, full));
  }

  return acc;
};

export const collectTrackedFiles = (root: string): string[] => {
  try {
    const out = execFileSync("git", ["ls-files"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const files = out.split("\n").filter(Boolean);
    if (files.length > 0) return files.sort();
  } catch {
    // git 없거나 저장소가 아니면 파일시스템 순회로 대체
  }

  return walkDir(root, root, []).sort();
};

export const readFileSafe = (root: string, relPath: string): string => {
  try {
    return fs.readFileSync(path.join(root, relPath), "utf8");
  } catch {
    return "";
  }
};

export const isSourceFile = (relPath: string): boolean =>
  /\.(ts|tsx|mts|mjs|js|jsx)$/.test(relPath);
