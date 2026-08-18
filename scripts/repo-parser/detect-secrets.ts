import type { SecretHit, SecretSeverity } from "./types.ts";

type SecretRule = {
  kind: string;
  severity: SecretSeverity;
  pattern: RegExp;
  valueGroup: number;
};

const SECRET_RULES: SecretRule[] = [
  {
    kind: "password",
    severity: "high",
    pattern: /(password|passwd|pwd)\s*[:=]\s*(["'`])([^"'`]{4,})\2/gi,
    valueGroup: 3,
  },
  {
    kind: "api-key",
    severity: "high",
    pattern:
      /(api[_-]?key|secret|access[_-]?token|private[_-]?key)\s*[:=]\s*(["'`])([^"'`]{12,})\2/gi,
    valueGroup: 3,
  },
  {
    kind: "phone",
    severity: "medium",
    pattern: /(01[016789][-\s]?\d{3,4}[-\s]?\d{4})/g,
    valueGroup: 1,
  },
  {
    kind: "email",
    severity: "medium",
    pattern: /([\w.+-]+@[\w-]+\.[\w.]{2,})/g,
    valueGroup: 1,
  },
  {
    kind: "address",
    severity: "low",
    pattern:
      /((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s+\S*(?:시|군|구)\s+\S+)/g,
    valueGroup: 1,
  },
];

const ENV_REFERENCE = /process\.env|import\.meta\.env/;
const PLACEHOLDER = /^(your|example|test@|sample|dummy|xxx|\.\.\.|<)/i;

const maskValue = (value: string): string => {
  const visible = value.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(3, Math.min(value.length - 2, 8)))}`;
};

const isFalsePositive = (line: string, value: string): boolean => {
  if (ENV_REFERENCE.test(line)) return true;
  if (PLACEHOLDER.test(value)) return true;
  if (value.includes("${")) return true;
  return false;
};

export const detectSecrets = (source: string): SecretHit[] => {
  const lines = source.split("\n");
  const hits: SecretHit[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    for (const { kind, severity, pattern, valueGroup } of SECRET_RULES) {
      pattern.lastIndex = 0;
      let match = pattern.exec(line);

      while (match !== null) {
        const value = match[valueGroup] ?? "";

        if (!isFalsePositive(line, value)) {
          const key = `${kind}:${value}:${index}`;

          if (!seen.has(key)) {
            seen.add(key);
            hits.push({
              line: index + 1,
              kind,
              severity,
              preview: maskValue(value),
            });
          }
        }
        match = pattern.exec(line);
      }
    }
  });

  return hits;
};

export const summarizeSecrets = (hits: SecretHit[]): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const { kind } of hits) {
    counts[kind] = (counts[kind] ?? 0) + 1;
  }

  return counts;
};
