/**
 * 환경 점검
 * 실행에 필요한 런타임, 환경변수, 데이터 파일이 준비됐는지 확인하고
 * 빠진 것마다 해결 방법을 알려준다.
 *
 * Usage:
 *   node scripts/check-setup/index.ts                  # 전체 점검
 *   node scripts/check-setup/index.ts --task=review    # 특정 작업에 필요한 것만
 *   node scripts/check-setup/index.ts --ask            # 사용자에게 물어볼 문항 출력
 */
import { checkRuntime } from "./check-runtime.ts";
import { checkEnv } from "./check-env.ts";
import { checkData } from "./check-data.ts";
import { renderReport, renderQuestions } from "./render-report.ts";
import { TASK_LABELS } from "./requirements.ts";
import type { CheckGroup } from "./types.ts";

const parseTasks = (argv: string[]): string[] => {
  const flag = argv.find((arg) => arg.startsWith("--task="));
  if (!flag) return [];

  return flag
    .replace("--task=", "")
    .split(",")
    .map((task) => task.trim())
    .filter((task) => task in TASK_LABELS);
};

const run = () => {
  const argv = process.argv.slice(2);
  const root = process.cwd();
  const tasks = parseTasks(argv);

  if (argv.includes("--ask")) {
    console.log(renderQuestions(tasks));
    return;
  }

  const groups: CheckGroup[] = [
    { title: "실행 환경", results: checkRuntime(root) },
    { title: "환경변수", results: checkEnv(root, tasks) },
    { title: "데이터 파일", results: checkData(root) },
  ];

  console.log(renderReport(groups, tasks));

  const failed = groups
    .flatMap((group) => group.results)
    .some((result) => result.status === "fail");

  if (failed) process.exit(1);
};

run();
