import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { CheckResult } from "./types.ts";

const MIN_NODE_MAJOR = 22;

const runQuiet = (command: string, args: string[]): string | null => {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const checkNode = (): CheckResult => {
  const major = Number(process.versions.node.split(".")[0]);

  if (major >= MIN_NODE_MAJOR) {
    return {
      name: "Node.js",
      status: "ok",
      detail: `v${process.versions.node}`,
    };
  }

  return {
    name: "Node.js",
    status: "fail",
    detail: `v${process.versions.node} — ${MIN_NODE_MAJOR} 이상이 필요합니다`,
    fix: "nvm install 22 && nvm use 22",
  };
};

const checkPnpm = (): CheckResult => {
  const version = runQuiet("pnpm", ["--version"]);

  if (version) {
    return { name: "pnpm", status: "ok", detail: `v${version}` };
  }

  return {
    name: "pnpm",
    status: "fail",
    detail: "설치되어 있지 않습니다",
    fix: "npm install -g pnpm",
  };
};

const checkDependencies = (root: string): CheckResult => {
  const installed = fs.existsSync(path.join(root, "node_modules"));
  const hasTsx = fs.existsSync(path.join(root, "node_modules", ".bin", "tsx"));

  if (installed && hasTsx) {
    return { name: "의존성", status: "ok", detail: "node_modules 준비됨" };
  }

  return {
    name: "의존성",
    status: "fail",
    detail: installed ? "tsx가 없습니다" : "node_modules가 없습니다",
    fix: "pnpm install",
  };
};

const checkPlaywright = (): CheckResult => {
  const cacheDir =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    path.join(os.homedir(), "Library", "Caches", "ms-playwright");

  if (!fs.existsSync(cacheDir)) {
    return {
      name: "Playwright Chromium",
      status: "fail",
      detail: "브라우저가 설치되어 있지 않습니다",
      fix: "pnpm exec playwright install chromium",
    };
  }

  const chromiums = fs
    .readdirSync(cacheDir)
    .filter((entry) => entry.startsWith("chromium"));

  if (chromiums.length === 0) {
    return {
      name: "Playwright Chromium",
      status: "fail",
      detail: "chromium 빌드를 찾지 못했습니다",
      fix: "pnpm exec playwright install chromium",
    };
  }

  return {
    name: "Playwright Chromium",
    status: "ok",
    detail: `${chromiums.length}개 빌드 설치됨`,
  };
};

export const checkRuntime = (root: string): CheckResult[] => [
  checkNode(),
  checkPnpm(),
  checkDependencies(root),
  checkPlaywright(),
];
