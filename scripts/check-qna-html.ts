import { ADMIN_MALL_ID, getAdminPassword } from "../src/shared/config/credentials";
import { chromium } from "playwright";
import { adminLoginAction } from "../src/features/auth/lib/admin-login-action";
import { createLog } from "../src/types/automation";

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // #1 상세 페이지 확인
  const detailUrl = "https://hanryeodamwon.cafe24.com/article/상품-qa/6/16/?no=16&board_no=6&spread_flag=T";
  console.log(`\n=== #1 상세 페이지 HTML 확인 ===`);
  await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
  await delay(3000);

  const html = await page.evaluate(() => {
    const board = document.querySelector(".xans-board-detail, .board-detail, .xans-board-read, #bo_v_con, .boardRead");
    if (board) return `[found] ${board.className}\n${board.innerHTML.substring(0, 3000)}`;

    // 더 넓게 찾기
    const candidates = [
      ".boardReadBody",
      ".board_view_content",
      ".view_content",
      "#bo_v_con",
      ".xans-board-detail",
      ".board-detail",
    ];
    const results: string[] = [];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) results.push(`${sel}: "${el.textContent?.trim().substring(0, 200)}"`);
    }

    if (results.length > 0) return results.join("\n");

    // 전체 body에서 본문 관련 요소 찾기
    const allDivs = document.querySelectorAll("div[class*='board'], div[class*='read'], div[class*='content'], div[class*='view']");
    const divInfo = Array.from(allDivs).map((d) => `${d.tagName}.${d.className}: "${d.textContent?.trim().substring(0, 100)}"`);
    return `NO MATCH. All board/read/content divs:\n${divInfo.join("\n")}`;
  });

  console.log(html);

  // 전체 페이지 텍스트도 확인
  console.log("\n=== 페이지 제목 영역 ===");
  const titleArea = await page.evaluate(() => {
    const subjectEl = document.querySelector(".xans-board-detail .subject, .board-detail .subject, th.subject, td.subject");
    return subjectEl ? `subject: "${subjectEl.textContent?.trim()}"` : "subject not found";
  });
  console.log(titleArea);

  // 본문 영역 찾기 - 더 넓게
  console.log("\n=== 본문 후보 영역 ===");
  const bodyArea = await page.evaluate(() => {
    const all = document.querySelectorAll("td, div, p");
    const candidates: string[] = [];
    for (const el of all) {
      const text = el.textContent?.trim() || "";
      if (text.includes("선물") || text.includes("구성") || text.includes("포장")) {
        candidates.push(`${el.tagName}.${el.className}#${el.id}: "${text.substring(0, 150)}"`);
      }
    }
    return candidates.slice(0, 20).join("\n");
  });
  console.log(bodyArea);

  await browser.close();
};

run().catch(console.error);
