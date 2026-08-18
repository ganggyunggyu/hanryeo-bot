import { ADMIN_MALL_ID, getAdminPassword } from "../src/shared/config/credentials";
import { chromium } from "playwright";
import { adminLoginAction } from "../src/features/auth/lib/admin-login-action";
import { createLog } from "../src/types/automation";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const onLog = (log: ReturnType<typeof createLog>) => console.log(`  [${log.level}] ${log.message}`);

const CAFE24_BASE = "https://hanryeodamwon.cafe24.com";

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "ko-KR" });
  const page = await context.newPage();

  await adminLoginAction(page, { mallId: ADMIN_MALL_ID, password: getAdminPassword() }, onLog);

  // 소식 게시판 목록
  console.log("\n=== 한려담원 소식 게시판 (board_no=1) ===");
  await page.goto(`${CAFE24_BASE}/board/free/list.html?board_no=1`, { waitUntil: "domcontentloaded" });
  await delay(2000);
  console.log("URL:", page.url());

  // 페이지 전체 텍스트에서 게시글 제목 찾기
  const pageText = await page.evaluate(() => {
    const main = document.querySelector(".board_list, .ec-base-board, #contents, .xans-board") as HTMLElement;
    return main?.innerHTML?.slice(0, 3000) ?? document.body.innerText.slice(0, 2000);
  });
  console.log("게시판 HTML:\n", pageText.slice(0, 2000));

  // 모든 링크 중 article 포함된 것
  const articleLinks = await page.$$eval("a", (links) =>
    links
      .map((a) => ({ text: a.textContent?.trim().slice(0, 60) ?? "", href: a.getAttribute("href") ?? "" }))
      .filter((l) => l.href.includes("article") || l.href.includes("read"))
  );
  console.log("\n글 링크:");
  articleLinks.forEach((l) => console.log(`  "${l.text}" → ${l.href}`));

  // 없으면 이벤트(board_no=2)도 확인
  if (articleLinks.length === 0) {
    console.log("\n=== 이벤트 게시판 (board_no=2) ===");
    await page.goto(`${CAFE24_BASE}/board/free/list.html?board_no=2`, { waitUntil: "domcontentloaded" });
    await delay(2000);
    const evtLinks = await page.$$eval("a", (links) =>
      links
        .map((a) => ({ text: a.textContent?.trim().slice(0, 60) ?? "", href: a.getAttribute("href") ?? "" }))
        .filter((l) => l.href.includes("article") || l.href.includes("read"))
    );
    console.log("이벤트 글 링크:");
    evtLinks.forEach((l) => console.log(`  "${l.text}" → ${l.href}`));

    // 이벤트 글 본문 확인
    if (evtLinks.length > 0) {
      const first = evtLinks[0];
      const href = first.href.startsWith("http") ? first.href : `${CAFE24_BASE}${first.href}`;
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await delay(1500);
      const bodyHtml = await page.evaluate(() => {
        const sel = document.querySelector(".board_view_content, .board_read .content, #boardReadBody, .fr-view, .board-detail");
        return sel?.innerHTML?.slice(0, 1500) ?? "본문 셀렉터 못 찾음";
      });
      console.log(`\n--- "${first.text}" 본문 HTML ---`);
      console.log(bodyHtml.slice(0, 1000));
    }
  }

  // 글이 있으면 본문 읽기
  if (articleLinks.length > 0) {
    for (const link of articleLinks.slice(0, 3)) {
      const href = link.href.startsWith("http") ? link.href : `${CAFE24_BASE}${link.href}`;
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await delay(1500);
      const bodyText = await page.evaluate(() => {
        const sel = document.querySelector(".board_view_content, .board_read .content, #boardReadBody, .fr-view, .board-detail");
        return sel?.textContent?.trim().slice(0, 500) ?? "본문 못 찾음";
      });
      console.log(`\n--- "${link.text}" ---`);
      console.log(bodyText);
    }
  }

  await browser.close();
};

run().catch(console.error);
