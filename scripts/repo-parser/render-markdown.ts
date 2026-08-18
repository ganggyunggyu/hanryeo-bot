import type { Entrypoint, RepoMap } from "./types.ts";

const escapeCell = (value: string): string => value.replace(/\|/g, "\\|");

const joinOrDash = (values: string[], limit = 6): string => {
  if (values.length === 0) return "-";
  const shown = values.slice(0, limit).map((value) => `\`${value}\``);
  const rest = values.length - limit;
  return rest > 0 ? `${shown.join(", ")} 외 ${rest}` : shown.join(", ");
};

const renderEntrypointGroup = (title: string, list: Entrypoint[]): string => {
  if (list.length === 0) return "";

  const rows = list.map((entry) => {
    const summary = entry.summary || "(설명 주석 없음)";
    const env = entry.envKeys.length > 0 ? joinOrDash(entry.envKeys, 3) : "-";
    return `| \`${entry.path}\` | ${escapeCell(summary)} | ${escapeCell(env)} |`;
  });

  return [
    `### ${title}`,
    "",
    "| 파일 | 설명 | 환경변수 |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
};

const renderUsageDetails = (list: Entrypoint[]): string => {
  const documented = list.filter((entry) => entry.usage.length > 0);
  if (documented.length === 0) return "";

  const blocks = documented.map((entry) =>
    [
      `#### \`${entry.path}\``,
      "",
      entry.summary ? `${entry.summary}` : "",
      "",
      "```bash",
      ...entry.usage,
      "```",
      "",
    ]
      .filter((line) => line !== "")
      .join("\n")
  );

  return ["### 사용법이 명시된 스크립트", "", ...blocks, ""].join("\n");
};

const renderFeatures = ({ features }: RepoMap): string => {
  if (features.length === 0) return "";

  const blocks = features.map((feature) => {
    const segmentLines = feature.segments.map(
      (segment) =>
        `- \`${segment.name}/\` (${segment.files.length}개 파일) — ${joinOrDash(segment.exports, 8)}`
    );

    return [`### \`${feature.name}\``, "", ...segmentLines, ""].join("\n");
  });

  return ["## 기능 슬라이스 (src/features)", "", ...blocks].join("\n");
};

const renderApiRoutes = ({ apiRoutes }: RepoMap): string => {
  if (apiRoutes.length === 0) return "";

  const rows = apiRoutes.map(
    (route) =>
      `| \`${route.route}\` | ${route.methods.join(", ") || "-"} | \`${route.path}\` |`
  );

  return [
    "## API 라우트",
    "",
    "| 경로 | 메서드 | 파일 |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
};

const renderEnv = ({ env }: RepoMap): string => {
  if (env.length === 0) return "";

  const rows = env.map(
    (item) =>
      `| \`${item.key}\` | ${item.usedIn.length} | \`${item.usedIn[0]}\` |`
  );

  return [
    "## 환경변수",
    "",
    "| 키 | 사용 파일 수 | 대표 사용처 |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
};

const renderSecrets = ({ entrypoints }: RepoMap): string => {
  const flagged = entrypoints.filter((entry) => entry.secrets.length > 0);
  if (flagged.length === 0) {
    return ["## 자격증명 점검", "", "하드코딩된 자격증명이 발견되지 않았습니다.", ""].join("\n");
  }

  const rows = flagged.map((entry) => {
    const kinds = [...new Set(entry.secrets.map((hit) => hit.kind))].sort();
    const worst = entry.secrets.some((hit) => hit.severity === "high")
      ? "high"
      : entry.secrets.some((hit) => hit.severity === "medium")
        ? "medium"
        : "low";
    return `| \`${entry.path}\` | ${worst} | ${entry.secrets.length} | ${kinds.join(", ")} |`;
  });

  return [
    "## 자격증명 점검",
    "",
    `하드코딩된 값이 남아 있는 파일 ${flagged.length}개입니다. 값은 마스킹되어 기록됩니다.`,
    "",
    "`high`(비밀번호, API 키)만 `pnpm repo:check` 실패로 처리합니다. `low`는 배송지 풀 같은 운영 데이터라 정상입니다.",
    "",
    "| 파일 | 심각도 | 탐지 건수 | 종류 |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
};

export const renderMarkdown = (map: RepoMap): string => {
  const rootEntries = map.entrypoints.filter((entry) => entry.group === "root");
  const scriptEntries = map.entrypoints.filter(
    (entry) => entry.group === "scripts"
  );

  const scriptRows = Object.entries(map.packageScripts).map(
    ([name, command]) => `| \`pnpm ${name}\` | \`${escapeCell(command)}\` |`
  );

  return [
    "# 저장소 구조 맵",
    "",
    `\`${map.generatedBy}\`가 생성한 문서입니다. 직접 수정하지 말고 \`pnpm repo:parse\`로 다시 생성하세요.`,
    "",
    "## 요약",
    "",
    `- 추적 파일: ${map.stats.trackedFiles}개`,
    `- 실행 진입점: ${map.stats.entrypoints}개`,
    `- 기능 슬라이스: ${map.stats.features}개`,
    `- API 라우트: ${map.stats.apiRoutes}개`,
    `- 환경변수: ${map.stats.envKeys}개`,
    `- 자격증명 잔존 파일: ${map.stats.filesWithSecrets}개 (그중 high 심각도 ${map.stats.filesWithHighSeverity}개)`,
    "",
    "## package.json 스크립트",
    "",
    "| 명령 | 내용 |",
    "| --- | --- |",
    ...scriptRows,
    "",
    "## 실행 진입점",
    "",
    "진입점은 `pnpm tsx <파일>`로 실행합니다. 상대 경로 import에 확장자가 없어 순수 `node`로는 실행되지 않습니다.",
    "",
    renderEntrypointGroup("루트 실행 스크립트", rootEntries),
    renderEntrypointGroup("scripts/ 보조 스크립트", scriptEntries),
    renderUsageDetails(map.entrypoints),
    renderFeatures(map),
    renderApiRoutes(map),
    renderEnv(map),
    renderSecrets(map),
  ]
    .filter((section) => section !== "")
    .join("\n");
};
