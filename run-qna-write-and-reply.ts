import { ADMIN_MALL_ID, getAdminPassword, getLegacyAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "./src/features/auth/lib/login-action";
import { writeQnaAction } from "./src/features/qna/lib/write-qna-action";
import { adminLoginAction } from "./src/features/auth/lib/admin-login-action";
import { writeQnaReplyAction } from "./src/features/qna/lib/write-qna-reply-action";
import { getReplyForQuestion } from "./src/features/qna/lib/qna-reply-templates";
import { createLog } from "./src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY || "";

const QNA_WRITE_COUNT = 3;
const QNA_DELAY_MIN = 40;
const QNA_DELAY_MAX = 60;
const REPLY_DELAY_MIN = 50;
const REPLY_DELAY_MAX = 70;

const PRODUCT_PAGE_BASE =
  "https://hanryeodamwon.cafe24.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};

interface QnaItem {
  no: string;
  title: string;
  href: string;
  hasComment: boolean;
  page: number;
}

// Phase 1: QNA 3건 작성 (로그인 실패 시 다음 계정으로 즉시 넘어감)
const writeQnas = async () => {
  if (!CAPTCHA_API_KEY) {
    console.error("CAPTCHA_API_KEY 환경변수를 설정해주세요.");
    process.exit(1);
  }

  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const candidates = accounts.filter((a: any) => (!a.qnaCount || a.qnaCount === 0) && a.qna);

  console.log("========================================");
  console.log(`  [Phase 1] QNA ${QNA_WRITE_COUNT}건 작성 — ${new Date().toLocaleString("ko-KR")}`);
  console.log(`  후보 계정: ${candidates.length}개`);
  console.log(`  딜레이: ${QNA_DELAY_MIN}~${QNA_DELAY_MAX}분`);
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: true });
  const results: { id: string; name: string; success: boolean; error?: string }[] = [];
  let successCount = 0;
  let candidateIdx = 0;

  while (successCount < QNA_WRITE_COUNT && candidateIdx < candidates.length) {
    const acc = candidates[candidateIdx];
    candidateIdx++;

    const tag = `[${successCount + 1}/${QNA_WRITE_COUNT}]`;

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    try {
      console.log(`\n${tag} ===== ${acc.name} (${acc.id}) — [${acc.qna.type}] =====`);

      const loginResult = await loginAction(
        page,
        { baseUrl: BASE_URL, id: acc.id, password: acc.password },
        onLog,
      );
      if (!loginResult.success) {
        console.log(`${tag} 로그인 실패 → 다음 계정으로 건너뜀`);
        await page.close();
        await context.close();
        continue;
      }

      const qnaResult = await writeQnaAction(
        page,
        { title: acc.qna.title, content: acc.qna.content, captchaApiKey: CAPTCHA_API_KEY },
        onLog,
      );
      if (!qnaResult.success) throw new Error(`QNA 작성 실패: ${qnaResult.error}`);

      const freshAccounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
      const idx = freshAccounts.findIndex((a: any) => a.id === acc.id);
      if (idx !== -1) {
        freshAccounts[idx].qnaCount = (freshAccounts[idx].qnaCount || 0) + 1;
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(freshAccounts, null, 2), "utf-8");
      }

      successCount++;
      results.push({ id: acc.id, name: acc.name, success: true });
      console.log(`${tag} SUCCESS (${successCount}/${QNA_WRITE_COUNT})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: acc.id, name: acc.name, success: false, error: msg });
      console.log(`${tag} FAILED: ${msg}`);
    } finally {
      await page.close();
      await context.close();
    }

    // 성공 후 다음 작성까지 대기 (마지막이 아닐 때만)
    if (successCount < QNA_WRITE_COUNT) {
      const gapMin = randomInt(QNA_DELAY_MIN, QNA_DELAY_MAX);
      const gapMs = gapMin * 60 * 1000;
      const nextTime = new Date(Date.now() + gapMs).toLocaleTimeString("ko-KR");
      console.log(`\n  대기 ${gapMin}분... (다음 시작: ${nextTime})`);
      await delay(gapMs);
    }
  }

  await browser.close();

  const failedList = results.filter((r) => !r.success);

  console.log("\n========================================");
  console.log(`  [Phase 1 결과]`);
  console.log(`  성공: ${successCount}/${QNA_WRITE_COUNT}`);
  console.log(`  시도: ${results.length}개 계정`);
  if (failedList.length > 0) {
    console.log(`  실패:`);
    failedList.forEach((r) => console.log(`    ${r.id} (${r.name}) | ${r.error}`));
  }
  console.log("========================================\n");

  return successCount;
};

// Phase 2: 미답변 QNA 답변 작성
const replyUnanswered = async () => {
  console.log("========================================");
  console.log(`  [Phase 2] 미답변 QNA 답변 작성 — ${new Date().toLocaleString("ko-KR")}`);
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
  });
  const page = await context.newPage();

  console.log("=== 어드민 로그인 ===");
  const loginResult = await adminLoginAction(page, { mallId: ADMIN_MALL_ID, password: getAdminPassword() }, onLog);
  if (!loginResult.success) {
    console.log("어드민 로그인 실패");
    await browser.close();
    return;
  }

  // 전체 페이지 스캔 (오래된 것부터)
  console.log("\n=== 전체 QNA 스캔 (오래된 것부터) ===");
  const allUnanswered: QnaItem[] = [];

  for (let pageNum = 20; pageNum >= 1; pageNum--) {
    const url = `${PRODUCT_PAGE_BASE}?page_6=${pageNum}#none`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await delay(2000);

    const rows = await page.evaluate(() => {
      const trs = document.querySelectorAll(".xans-product-qna tbody.center tr.xans-record-");
      return Array.from(trs).map((tr) => {
        const tds = tr.querySelectorAll("td");
        const link = tr.querySelector("td.subject a") as HTMLAnchorElement;
        const comment = tr.querySelector("td.subject .comment");
        return {
          no: tds[0]?.textContent?.trim() || "",
          title: link?.textContent?.trim() || "",
          href: link?.getAttribute("href") || "",
          hasComment: (comment?.textContent?.trim() || "") !== "",
        };
      });
    });

    if (rows.length === 0) continue;

    const sorted = [...rows].sort((a, b) => Number(a.no) - Number(b.no));
    const unanswered = sorted.filter((r) => !r.hasComment);
    unanswered.forEach((r) => allUnanswered.push({ ...r, page: pageNum }));

    console.log(`  페이지 ${pageNum}: ${rows.length}개 중 미답변 ${unanswered.length}개`);
  }

  console.log(`\n총 미답변: ${allUnanswered.length}개\n`);

  if (allUnanswered.length === 0) {
    console.log("답변할 대상이 없습니다.");
    await browser.close();
    return;
  }

  // 답변 작성
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < allUnanswered.length; i++) {
    const item = allUnanswered[i];
    const replyText = getReplyForQuestion(item.title);
    const detailUrl = `https://hanryeodamwon.cafe24.com${item.href}`;

    console.log(`\n[${i + 1}/${allUnanswered.length}] #${item.no} "${item.title}"`);
    console.log(`  답변: ${replyText.substring(0, 60)}...`);

    const result = await writeQnaReplyAction(
      page,
      {
        detailUrl,
        replyText,
        commentName: "한려담원",
        commentPassword: getLegacyAccountPassword(),
      },
      onLog,
    );

    if (result.success) {
      successCount++;
      console.log(`  => 성공 (${successCount}/${i + 1})`);
    } else {
      failCount++;
      console.log(`  => 실패: ${result.error}`);
    }

    if (i < allUnanswered.length - 1) {
      const waitSec = randomInt(REPLY_DELAY_MIN, REPLY_DELAY_MAX);
      console.log(`  대기: ${waitSec}초`);
      await delay(waitSec * 1000);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log("\n========================================");
  console.log(`  [Phase 2 결과] QNA 답변`);
  console.log(`  성공: ${successCount}개`);
  console.log(`  실패: ${failCount}개`);
  console.log(`  소요 시간: 약 ${elapsed}분`);
  console.log("========================================");

  await browser.close();
};

// Main
const run = async () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  QNA 작성 + 답변 통합 배치               ║");
  console.log(`║  시작: ${new Date().toLocaleString("ko-KR").padEnd(31)}║`);
  console.log("╚══════════════════════════════════════════╝\n");

  // Phase 1: QNA 3건 작성
  const writeSuccess = await writeQnas();

  if (writeSuccess === 0) {
    console.log("QNA 작성 성공이 0건이므로 답변 단계 생략");
    return;
  }

  // Phase 1 → Phase 2 사이 대기
  const gapMin = randomInt(5, 10);
  console.log(`\n  Phase 1→2 전환 대기 ${gapMin}분...\n`);
  await delay(gapMin * 60 * 1000);

  // Phase 2: 미답변 답변 작성
  await replyUnanswered();

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  전체 완료                                ║");
  console.log(`║  종료: ${new Date().toLocaleString("ko-KR").padEnd(31)}║`);
  console.log("╚══════════════════════════════════════════╝");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
