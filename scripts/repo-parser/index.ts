/**
 * 저장소 파서
 * 추적 중인 파일을 훑어 실행 진입점, 기능 슬라이스, API 라우트, 환경변수,
 * 하드코딩된 자격증명을 뽑아 문서와 기계 판독용 맵으로 만든다.
 *
 * Usage:
 *   node scripts/repo-parser/index.ts                 # docs/REPOSITORY.md + docs/repo-map.json 생성
 *   node scripts/repo-parser/index.ts --stdout        # 파일을 쓰지 않고 마크다운만 출력
 *   node scripts/repo-parser/index.ts --check         # 자격증명이 남아 있으면 종료코드 1
 *   node scripts/repo-parser/index.ts --json out.json # 출력 경로 지정
 */
import fs from "node:fs";
import path from "node:path";
import { buildRepoMap } from "./build-repo-map.ts";
import { renderMarkdown } from "./render-markdown.ts";

const DEFAULT_MD = "docs/REPOSITORY.md";
const DEFAULT_JSON = "docs/repo-map.json";

const readOption = (argv: string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
};

const writeOutput = (root: string, relPath: string, content: string) => {
  const target = path.resolve(root, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return target;
};

const run = () => {
  const argv = process.argv.slice(2);
  const root = process.cwd();
  const map = buildRepoMap(root);
  const markdown = renderMarkdown(map);

  if (argv.includes("--stdout")) {
    process.stdout.write(`${markdown}\n`);
  } else {
    const mdPath = readOption(argv, "--md") ?? DEFAULT_MD;
    const jsonPath = readOption(argv, "--json") ?? DEFAULT_JSON;

    writeOutput(root, mdPath, `${markdown}\n`);
    writeOutput(root, jsonPath, `${JSON.stringify(map, null, 2)}\n`);

    console.log(`문서 생성: ${mdPath}`);
    console.log(`맵 생성:   ${jsonPath}`);
  }

  const { stats } = map;
  console.log(
    `진입점 ${stats.entrypoints} / 기능 ${stats.features} / 라우트 ${stats.apiRoutes} / 환경변수 ${stats.envKeys}`
  );

  if (stats.filesWithSecrets > 0) {
    console.warn(
      `참고: 마스킹 탐지 ${stats.filesWithSecrets}개 파일 (high 심각도 ${stats.filesWithHighSeverity}개)`
    );
  }

  if (argv.includes("--check") && stats.filesWithHighSeverity > 0) {
    console.error(
      `실패: 비밀번호나 API 키가 ${stats.filesWithHighSeverity}개 파일에 하드코딩되어 있습니다.`
    );
    process.exit(1);
  }
};

run();
