import { ADMIN_MALL_ID, getAdminPassword } from "../src/shared/config/credentials";
import { chromium } from "playwright";
import { adminLoginAction } from "../src/features/auth/lib/admin-login-action";
import { createLog } from "../src/types/automation";
import { writeFileSync } from "fs";

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BASE_URL = "https://hanryeodamwon.cafe24.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";

interface QnaItem {
  no: string;
  title: string;
  href: string;
  hasComment: boolean;
  author: string;
  date: string;
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
  if (!loginResult.success) { console.log("로그인 실패"); return; }

  const allItems: QnaItem[] = [];

  for (let pageNum = 1; pageNum <= 20; pageNum++) {
    const url = `${BASE_URL}?page_6=${pageNum}#none`;
    console.log(`\n=== 페이지 ${pageNum}/20 ===`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await delay(2000);

    const rows = await page.evaluate(() => {
      const trs = document.querySelectorAll(".xans-product-qna tbody.center tr.xans-record-");
      return Array.from(trs).map(tr => {
        const tds = tr.querySelectorAll("td");
        const link = tr.querySelector("td.subject a") as HTMLAnchorElement;
        const comment = tr.querySelector("td.subject .comment");
        return {
          no: tds[0]?.textContent?.trim() || "",
          title: link?.textContent?.trim() || "",
          href: link?.getAttribute("href") || "",
          hasComment: (comment?.textContent?.trim() || "") !== "",
          author: tds[3]?.textContent?.trim() || "",
          date: tds[4]?.textContent?.trim() || "",
        };
      });
    });

    if (rows.length === 0) {
      console.log("  항목 없음 - 마지막 페이지");
      break;
    }

    const withComment = rows.filter(r => r.hasComment).length;
    const withoutComment = rows.filter(r => !r.hasComment).length;
    console.log(`  항목: ${rows.length}개 (답변O: ${withComment}, 답변X: ${withoutComment})`);
    rows.forEach(r => {
      const mark = r.hasComment ? "O" : "X";
      console.log(`  [${mark}] #${r.no} | ${r.title} | ${r.author}`);
    });

    rows.forEach(r => allItems.push({ ...r, page: pageNum }));
  }

  // 통계
  const total = allItems.length;
  const answered = allItems.filter(r => r.hasComment).length;
  const unanswered = allItems.filter(r => !r.hasComment).length;

  console.log("\n==========================================");
  console.log(`전체 QNA: ${total}개`);
  console.log(`답변 완료: ${answered}개`);
  console.log(`미답변: ${unanswered}개`);
  console.log("==========================================");

  // 미답변 목록만 따로
  const unansweredItems = allItems.filter(r => !r.hasComment);
  console.log("\n=== 미답변 QNA 목록 ===");
  unansweredItems.forEach(r => {
    console.log(`#${r.no} | ${r.title} | ${r.author} | page ${r.page}`);
  });

  // JSON 파일로 저장
  const outputPath = "/Users/ganggyunggyu/Programing/21lab/hanryeo-bot/scripts/qna-scan-result.json";
  writeFileSync(outputPath, JSON.stringify({ total, answered, unanswered, allItems, unansweredItems }, null, 2));
  console.log(`\n결과 저장: ${outputPath}`);

  await browser.close();
  console.log("스캔 완료!");
};

run().catch(console.error);
