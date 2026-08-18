import fs from "node:fs";
import path from "node:path";
import type { CheckResult } from "./types.ts";

type DataFile = {
  relPath: string;
  label: string;
  required: boolean;
  fix: string;
};

const DATA_FILES: DataFile[] = [
  {
    relPath: "accounts/completed-accounts.json",
    label: "생성 완료 계정 목록",
    required: false,
    fix: "계정을 아직 만들지 않았다면 비어 있어도 됩니다. pnpm tsx run-daily-pipeline.ts 로 생성됩니다",
  },
  {
    relPath: "accounts/custom-targets.json",
    label: "커스텀 배치 대상",
    required: false,
    fix: "cp accounts/custom-targets.example.json accounts/custom-targets.json",
  },
  {
    relPath: "한려담원_리뷰사진",
    label: "리뷰 이미지 디렉터리",
    required: false,
    fix: "리뷰 이미지 배치를 쓸 때만 필요합니다. 세트별 폴더에 webp 이미지를 넣습니다",
  },
];

const describeEntry = (target: string): string => {
  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    return `${fs.readdirSync(target).length}개 항목`;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    return Array.isArray(parsed) ? `${parsed.length}건` : "존재함";
  } catch {
    return "존재함";
  }
};

export const checkData = (root: string): CheckResult[] =>
  DATA_FILES.map(({ relPath, label, required, fix }) => {
    const target = path.join(root, relPath);

    if (fs.existsSync(target)) {
      return {
        name: relPath,
        status: "ok" as const,
        detail: `${label} — ${describeEntry(target)}`,
      };
    }

    return {
      name: relPath,
      status: required ? ("fail" as const) : ("warn" as const),
      detail: `${label} 없음`,
      fix,
    };
  });
