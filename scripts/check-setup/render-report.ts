import { ENV_REQUIREMENTS, TASK_LABELS } from "./requirements.ts";
import type { CheckGroup, CheckStatus } from "./types.ts";

const MARK: Record<CheckStatus, string> = {
  ok: "  ok  ",
  warn: " warn ",
  fail: " FAIL ",
};

export const renderReport = (groups: CheckGroup[], tasks: string[]): string => {
  const lines: string[] = [];
  const scope =
    tasks.length === 0
      ? "전체"
      : tasks.map((task) => TASK_LABELS[task] ?? task).join(", ");

  lines.push(`환경 점검 — 대상 작업: ${scope}`, "");

  for (const { title, results } of groups) {
    if (results.length === 0) continue;

    lines.push(`[${title}]`);

    for (const { name, status, detail, fix } of results) {
      lines.push(`${MARK[status]} ${name} — ${detail}`);
      if (status !== "ok" && fix) lines.push(`        → ${fix}`);
    }

    lines.push("");
  }

  const all = groups.flatMap((group) => group.results);
  const counts = {
    ok: all.filter((result) => result.status === "ok").length,
    warn: all.filter((result) => result.status === "warn").length,
    fail: all.filter((result) => result.status === "fail").length,
  };

  lines.push(`요약: 통과 ${counts.ok} / 경고 ${counts.warn} / 실패 ${counts.fail}`);

  const blockers = all.filter((result) => result.status === "fail");

  if (blockers.length === 0) {
    lines.push("", "실행 준비가 끝났습니다.");
    return lines.join("\n");
  }

  lines.push("", "다음에 할 일");
  blockers.forEach((blocker, index) => {
    lines.push(`  ${index + 1}. ${blocker.name} — ${blocker.fix ?? blocker.detail}`);
  });

  return lines.join("\n");
};

export const renderQuestions = (tasks: string[]): string => {
  const relevant = ENV_REQUIREMENTS.filter(
    (requirement) =>
      tasks.length === 0 ||
      requirement.tasks.some((task) => tasks.includes(task))
  );

  const lines = [
    "실행에 필요한 값입니다. 아래를 받아 .env에 채우세요.",
    "",
  ];

  for (const { key, label, optional, hint, tasks: usedBy } of relevant) {
    const mark = optional ? "(선택)" : "(필수)";
    const where = usedBy.map((task) => TASK_LABELS[task] ?? task).join(", ");

    lines.push(`${key} ${mark}`);
    lines.push(`  묻는 내용: ${label}`);
    lines.push(`  쓰이는 곳: ${where}`);
    lines.push(`  안내: ${hint}`);
    lines.push("");
  }

  lines.push("값을 받은 뒤 .env에 넣고 pnpm setup:check 로 확인하세요.");

  return lines.join("\n");
};
