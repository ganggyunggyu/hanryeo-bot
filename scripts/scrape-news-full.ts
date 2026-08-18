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

  const articles = [
    { title: "아침 공복에 좋은 음식 5가지", url: "/article/한려담원-소식/1/440/" },
    { title: "몸에 기운이 부족한 이유", url: "/article/한려담원-소식/1/425/" },
    { title: "홍삼, 영지버섯, 동충하초 효능 알려드립니다", url: "/article/한려담원-소식/1/412/" },
  ];

  for (const art of articles) {
    await page.goto(CAFE24_BASE + art.url, { waitUntil: "domcontentloaded" });
    await delay(2000);
    const html = await page.evaluate(() => {
      const sel = document.querySelector(".board_view_content, .board_read .content, #boardReadBody, .fr-view, .board-detail");
      return sel?.innerHTML ?? "못 찾음";
    });
    console.log("\n========== " + art.title + " ==========");
    console.log(html);
    console.log("========== END ==========");
  }
  await browser.close();
};
run().catch(console.error);
