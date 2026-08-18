import { ADMIN_MALL_ID, getAdminPassword } from "../src/shared/config/credentials";
import { chromium } from "playwright";
import { adminLoginAction } from "../src/features/auth/lib/admin-login-action";
import { createLog } from "../src/types/automation";
import * as fs from "fs";

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BASE_URL =
  "https://hanryeodamwon.cafe24.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";

interface QnaItem {
  no: string;
  title: string;
  href: string;
  hasComment: boolean;
  page: number;
}

interface QnaDetail {
  no: string;
  title: string;
  content: string;
  href: string;
  hasComment: boolean;
  reply: string;
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

  // 1. 전체 페이지 스캔 (오래된 것부터)
  console.log("\n=== 전체 QNA 목록 수집 ===");
  const allItems: QnaItem[] = [];

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

    const sorted = [...rows].sort((a, b) => Number(a.no) - Number(b.no));
    sorted.forEach((r) => allItems.push({ ...r, page: pageNum }));
    console.log(`  페이지 ${pageNum}: ${rows.length}개 (답변있음: ${sorted.filter((r) => r.hasComment).length})`);
  }

  console.log(`\n총 QNA: ${allItems.length}개`);

  // 2. 각 상세 페이지에서 본문 수집
  console.log("\n=== 상세 페이지 본문 수집 ===");
  const details: QnaDetail[] = [];

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const detailUrl = `https://hanryeodamwon.cafe24.com${item.href}`;

    await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
    await delay(1500);

    const content = await page.evaluate(() => {
      const contentEl = document.querySelector(".detail .fr-view-article");
      if (contentEl) return contentEl.textContent?.trim() || "";
      const fallback = document.querySelector(".detail");
      return fallback?.textContent?.trim() || "";
    });

    details.push({
      no: item.no,
      title: item.title,
      content,
      href: item.href,
      hasComment: item.hasComment,
      reply: "",
    });

    console.log(`  [${i + 1}/${allItems.length}] #${item.no} "${item.title}"`);
    console.log(`    본문: ${content.substring(0, 80)}${content.length > 80 ? "..." : ""}`);
  }

  // 3. JSON 저장
  const outputPath = "scripts/qna-detail-list.json";
  fs.writeFileSync(outputPath, JSON.stringify(details, null, 2), "utf-8");
  console.log(`\n저장 완료: ${outputPath} (${details.length}개)`);

  await browser.close();
};

run().catch(console.error);
