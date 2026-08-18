import { ADMIN_MALL_ID, getAdminPassword, getLegacyAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import { adminLoginAction } from "./src/features/auth/lib/admin-login-action";
import { writeQnaReplyAction } from "./src/features/qna/lib/write-qna-reply-action";
import { getReplyForQuestion } from "./src/features/qna/lib/qna-reply-templates";
import { createLog } from "./src/types/automation";

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const BASE_URL =
  "https://hanryeodamwon.cafe24.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";

interface QnaItem {
  no: string;
  title: string;
  href: string;
  hasComment: boolean;
  page: number;
}

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "ko-KR",
  });
  const page = await context.newPage();

  console.log("=== 어드민 로그인 ===");
  const loginResult = await adminLoginAction(page, { mallId: ADMIN_MALL_ID, password: getAdminPassword() }, onLog);
  if (!loginResult.success) {
    console.log("로그인 실패");
    await browser.close();
    return;
  }

  // 1. 전체 페이지 스캔 (오래된 것부터: 20 → 1)
  console.log("\n=== 전체 QNA 스캔 (오래된 것부터) ===");
  const allUnanswered: QnaItem[] = [];

  for (let pageNum = 20; pageNum >= 1; pageNum--) {
    const url = `${BASE_URL}?page_6=${pageNum}#none`;
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

    // 페이지 내에서도 번호 오름차순(오래된 것부터)으로 정렬
    const sorted = [...rows].sort((a, b) => Number(a.no) - Number(b.no));
    const unanswered = sorted.filter((r) => !r.hasComment);
    unanswered.forEach((r) => allUnanswered.push({ ...r, page: pageNum }));

    console.log(`  페이지 ${pageNum}: ${rows.length}개 중 미답변 ${unanswered.length}개`);
  }

  console.log(`\n총 미답변: ${allUnanswered.length}개`);
  console.log("순서: 오래된 것(#1)부터 최신(#98)까지\n");

  // 2. 답변 작성
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < allUnanswered.length; i++) {
    const item = allUnanswered[i];
    const replyText = getReplyForQuestion(item.title);
    const detailUrl = `https://hanryeodamwon.cafe24.com${item.href}`;

    console.log(`\n[${i + 1}/${allUnanswered.length}] #${item.no} "${item.title}"`);
    console.log(`  답변: ${replyText.substring(0, 50)}...`);

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

    // 마지막이 아니면 50~70초 대기
    if (i < allUnanswered.length - 1) {
      const waitSec = randomInt(50, 70);
      console.log(`  대기: ${waitSec}초`);
      await delay(waitSec * 1000);
    }
  }

  // 3. 결과 리포트
  const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log("\n==========================================");
  console.log(`QNA 답변 배치 완료`);
  console.log(`성공: ${successCount}개`);
  console.log(`실패: ${failCount}개`);
  console.log(`소요 시간: 약 ${elapsed}분`);
  console.log("==========================================");

  await browser.close();
};

run().catch(console.error);
