import fs from "node:fs";
import path from "node:path";
import { ENV_REQUIREMENTS } from "./requirements.ts";
import type { CheckResult } from "./types.ts";

const parseEnvFile = (contents: string): Record<string, string> => {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key) values[key] = value;
  }

  return values;
};

const isPlaceholder = (value: string): boolean =>
  value === "" ||
  value === "010-0000-0000" ||
  /^(your|change|todo|xxx|<)/i.test(value);

export const checkEnv = (root: string, tasks: string[]): CheckResult[] => {
  const envPath = path.join(root, ".env");

  if (!fs.existsSync(envPath)) {
    return [
      {
        name: ".env 파일",
        status: "fail",
        detail: "파일이 없습니다",
        fix: "cp .env.example .env",
      },
    ];
  }

  const values = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  const results: CheckResult[] = [
    { name: ".env 파일", status: "ok", detail: "존재함" },
  ];

  const relevant = ENV_REQUIREMENTS.filter(
    (requirement) =>
      tasks.length === 0 ||
      requirement.tasks.some((task) => tasks.includes(task))
  );

  for (const { key, label, optional, hint } of relevant) {
    const value = values[key] ?? process.env[key] ?? "";

    if (!isPlaceholder(value)) {
      results.push({ name: key, status: "ok", detail: `${label} 설정됨` });
      continue;
    }

    results.push({
      name: key,
      status: optional ? "warn" : "fail",
      detail: optional ? `${label} 비어 있음 (선택)` : `${label} 비어 있음`,
      fix: hint,
    });
  }

  return results;
};
