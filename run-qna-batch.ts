import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "./src/features/auth/lib/login-action";
import { writeQnaAction } from "./src/features/qna/lib/write-qna-action";
import { createLog } from "./src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY || "";

const BATCH_SIZE = Number(process.env.BATCH_SIZE) || 100;
const MIN_DELAY_MIN = Number(process.env.MIN_DELAY) || 3;
const MAX_DELAY_MIN = Number(process.env.MAX_DELAY) || 8;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};

const run = async () => {
  if (!CAPTCHA_API_KEY) {
    console.error("CAPTCHA_API_KEY 환경변수를 설정해주세요.");
    process.exit(1);
  }

  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const targets = accounts.filter((a: any) => a.qna && !a.qnaCount).slice(0, BATCH_SIZE);

  if (targets.length === 0) {
    console.log("QNA 작성할 계정이 없습니다.");
    return;
  }

  console.log("========================================");
  console.log(`  QNA 배치 시작 — ${targets.length}개 계정`);
  console.log(`  딜레이: ${MIN_DELAY_MIN}~${MAX_DELAY_MIN}분`);
  console.log(`  예상 소요: ${Math.round(targets.length * ((MIN_DELAY_MIN + MAX_DELAY_MIN) / 2))}분`);
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: process.env.HEADLESS === "true" });
  const results: { id: string; name: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < targets.length; i++) {
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
      console.log(`\n${tag} ===== ${acc.name} (${acc.id}) — [${acc.qna.type}] =====`);

      // 1. 로그인
      const loginResult = await loginAction(
        page,
        { baseUrl: BASE_URL, id: acc.id, password: acc.password },
        onLog,
      );
      if (!loginResult.success) throw new Error(`로그인 실패: ${loginResult.error}`);

      // 2. QNA 작성
      const qnaResult = await writeQnaAction(
        page,
        { title: acc.qna.title, content: acc.qna.content, captchaApiKey: CAPTCHA_API_KEY },
        onLog,
      );

      if (!qnaResult.success) throw new Error(`QNA 작성 실패: ${qnaResult.error}`);

      // qnaCount 증가
      const freshAccounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
      const idx = freshAccounts.findIndex((a: any) => a.id === acc.id);
      if (idx !== -1) {
        freshAccounts[idx].qnaCount = (freshAccounts[idx].qnaCount || 0) + 1;
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(freshAccounts, null, 2), "utf-8");
      }

      results.push({ id: acc.id, name: acc.name, success: true });
      console.log(`${tag} SUCCESS`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: acc.id, name: acc.name, success: false, error: msg });
      console.log(`${tag} FAILED: ${msg}`);
    } finally {
      await page.close();
      await context.close();
    }

    // 다음 계정 대기
    if (i < targets.length - 1) {
      const gapMin = randomInt(MIN_DELAY_MIN, MAX_DELAY_MIN);
      const gapMs = gapMin * 60 * 1000;
      const nextTime = new Date(Date.now() + gapMs).toLocaleTimeString("ko-KR");
      console.log(`  대기 ${gapMin}분... (다음 시작: ${nextTime})`);
      await delay(gapMs);
    }
  }

  await browser.close();

  const successCount = results.filter((r) => r.success).length;
  const failedList = results.filter((r) => !r.success);

  console.log("\n\n========================================");
  console.log("          QNA 배치 결과");
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
