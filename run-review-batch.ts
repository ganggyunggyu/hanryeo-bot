import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "./src/features/auth/lib/login-action";
import { visitProductAction } from "./src/features/product/lib/visit-product-action";
import { writeReviewAction } from "./src/features/review/lib/write-review-action";
import { createLog } from "./src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/#review";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const BATCH_SIZE = parseNumberEnv(process.env.BATCH_SIZE, 50);
const TARGET_SUCCESS = parseNumberEnv(process.env.TARGET_SUCCESS, BATCH_SIZE);
const MIN_DELAY_MIN = parseNumberEnv(process.env.MIN_DELAY, 5);
const MAX_DELAY_MIN = parseNumberEnv(process.env.MAX_DELAY, 12);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};

const run = async () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const toTime = (value: unknown): number => {
    if (typeof value !== "string") return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const targets = accounts
    .filter((a: any) => a.reviewCount > 0 && a.review)
    .sort((a: any, b: any) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, BATCH_SIZE);
  const targetSuccess = Math.min(TARGET_SUCCESS, targets.length);

  if (targets.length === 0) {
    console.log("리뷰 수정할 계정이 없습니다.");
    return;
  }

  console.log("========================================");
  console.log(`  리뷰 배치 시작 — 최대 ${targets.length}개 계정 시도`);
  console.log(`  목표 성공: ${targetSuccess}건`);
  console.log(`  딜레이: ${MIN_DELAY_MIN}~${MAX_DELAY_MIN}분`);
  console.log(`  예상 소요: ${Math.round(targets.length * ((MIN_DELAY_MIN + MAX_DELAY_MIN) / 2))}분`);
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: process.env.HEADLESS === "true" });
  const results: { id: string; name: string; success: boolean; error?: string }[] = [];
  let succeeded = 0;

  for (let i = 0; i < targets.length && succeeded < targetSuccess; i++) {
    const acc = targets[i];
    const tag = `[${i + 1}/${targets.length}]`;

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    try {
      console.log(`\n${tag} ===== ${acc.name} (${acc.id}) — [${acc.review.type}] =====`);

      // 1. 로그인
      const loginResult = await loginAction(
        page,
        { baseUrl: BASE_URL, id: acc.id, password: acc.password },
        onLog,
      );
      if (!loginResult.success) throw new Error(`로그인 실패: ${loginResult.error}`);

      // 2. 제품 페이지
      const visitResult = await visitProductAction(page, { productUrl: PRODUCT_URL }, onLog);
      if (!visitResult.success) throw new Error(`제품 페이지 실패: ${visitResult.error}`);

      // 3. 리뷰 수정
      const reviewResult = await writeReviewAction(
        page,
        { accountId: acc.id, title: acc.review.title, content: acc.review.content },
        onLog,
      );

      if (!reviewResult.success) throw new Error(`리뷰 수정 실패: ${reviewResult.error}`);

      results.push({ id: acc.id, name: acc.name, success: true });
      succeeded += 1;
      console.log(`${tag} SUCCESS`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: acc.id, name: acc.name, success: false, error: msg });
      console.log(`${tag} FAILED: ${msg}`);
    } finally {
      await page.close();
      await context.close();
    }

    // 다음 계정 대기 (마지막 제외)
    if (i < targets.length - 1 && succeeded < targetSuccess) {
      const gapMin = randomInt(MIN_DELAY_MIN, MAX_DELAY_MIN);
      const gapMs = gapMin * 60 * 1000;
      const nextTime = new Date(Date.now() + gapMs).toLocaleTimeString("ko-KR");
      console.log(`  대기 ${gapMin}분... (다음 시작: ${nextTime})`);
      await delay(gapMs);
    }
  }

  await browser.close();

  // 결과 리포트
  const successCount = results.filter((r) => r.success).length;
  const failedList = results.filter((r) => !r.success);

  console.log("\n\n========================================");
  console.log("          리뷰 배치 결과");
  console.log("========================================");
  console.log(`성공: ${successCount}/${targets.length}`);
  console.log(`실패: ${failedList.length}/${targets.length}`);

  if (failedList.length > 0) {
    console.log("\n--- 실패 목록 ---");
    failedList.forEach((r) => {
      console.log(`  ${r.id} (${r.name}) | ${r.error}`);
    });
  }

  console.log("\n완료!");
};

run().catch(console.error);
