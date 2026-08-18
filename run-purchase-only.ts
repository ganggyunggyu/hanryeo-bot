import { getAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/24/display/1/";
const ADDRESS = "매산로116번길23-4";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");

const loadAccounts = () => {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
};

const TARGETS = [
  { id: "namu2972", password: getAccountPassword(), name: "강지영" },
];

const run = async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "true" });
  const results: { id: string; name: string; purchased: boolean; error?: string }[] = [];

  for (let i = 0; i < TARGETS.length; i++) {
    const acc = TARGETS[i];
    const tag = `[${i + 1}/${TARGETS.length}]`;
    const result = { id: acc.id, name: acc.name, purchased: false, error: undefined as string | undefined };

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
    });
    const page = await context.newPage();

    page.on("dialog", async (d) => {
      console.log(`  ${tag} [팝업] ${d.type()}: ${d.message()}`);
      if (d.message().includes("삭제")) {
        await d.dismiss();
      } else if (d.message().includes("장바구니")) {
        await d.dismiss();
      } else {
        await d.accept();
      }
    });

    try {
      // 로그인
      console.log(`\n${tag} ===== 구매 시작: ${acc.name} (${acc.id}) =====`);
      await page.goto(`${BASE_URL}/member/login.html`, { waitUntil: "domcontentloaded" });
      await delay(1500);
      await page.fill("#member_id", acc.id);
      await delay(200);
      await page.fill("#member_passwd", acc.password);
      await delay(200);
      await page.evaluate(() => {
        const btn = document.querySelector('a.btnSubmit[onclick*="MemberAction.login"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(3000);
      console.log(`  ${tag} 로그인 완료`);

      // 장바구니 비우기
      await page.goto(`${BASE_URL}/order/basket.html`, { waitUntil: "domcontentloaded" });
      await delay(2000);
      const hasItems = await page.$("input[name='basket_product_Check']");
      if (hasItems) {
        await page.evaluate(() => {
          const allCheck = document.querySelector("input[id='allCheck']") as HTMLInputElement;
          if (allCheck && !allCheck.checked) allCheck.click();
        });
        await delay(300);
        const deleteBtn = await page.$("a[href*='basket_delete'], button[onclick*='basket_delete'], .btnBasic[onclick*='delete']");
        if (deleteBtn) {
          await deleteBtn.click();
          await delay(2000);
        } else {
          await page.evaluate(() => {
            const fn = (window as unknown as Record<string, unknown>).basket_delete as (() => void) | undefined;
            if (fn) fn();
          });
          await delay(2000);
        }
        console.log(`  ${tag} 장바구니 비움`);
      } else {
        console.log(`  ${tag} 장바구니 비어있음`);
      }

      // 상품 → 옵션 선택 → BUY
      await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded" });
      await delay(2000);

      // 옵션1 선택
      await page.selectOption("#product_option_id1", { label: "한려담원 흑염소진액" });
      console.log(`  ${tag} 옵션1 선택 완료`);
      await delay(2000);

      // 옵션2 선택 (30포)
      await page.selectOption("#product_option_id2", { label: "30포" });
      console.log(`  ${tag} 옵션2 선택 완료`);
      await delay(1000);

      // 구매하기 클릭
      await page.evaluate(() => {
        const btn = document.querySelector('a.btnSubmit[onclick*="product_submit(1"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(3000);
      console.log(`  ${tag} 주문 페이지 도달`);

      // 주소검색 버튼 스크롤 + 클릭
      await page.evaluate(() => {
        const btn = document.querySelector("#btn_search_rzipcode") as HTMLElement;
        if (btn) btn.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await delay(500);
      await page.click("#btn_search_rzipcode", { force: true });
      console.log(`  ${tag} 주소검색 버튼 클릭`);

      // 카카오 내부 프레임 로딩 대기 (postcode.map.kakao.com)
      let kakaoFrame = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await delay(500);
        kakaoFrame = page.frames().find((f) => f.url().includes("postcode.map.kakao.com"));
        if (kakaoFrame) break;
      }
      if (!kakaoFrame) throw new Error("카카오 프레임 못 찾음");
      console.log(`  ${tag} 카카오 프레임 발견`);

      const searchInput = await kakaoFrame.waitForSelector("input#region_name", { timeout: 10000 });
      await searchInput.click({ force: true });
      await searchInput.fill(ADDRESS);
      await delay(500);
      await searchInput.press("Enter");
      await delay(3000);

      // 검색 결과 클릭 (도로명 주소)
      const addrResult = await kakaoFrame.$("span.txt_address button.link_post")
        ?? await kakaoFrame.$(".link_post");
      if (!addrResult) throw new Error("주소 검색 결과 없음");
      await addrResult.click();
      await delay(3000);
      console.log(`  ${tag} 주소 입력 완료`);

      // 은행
      const options = await page.$$eval("#bankaccount option", (opts) =>
        opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
      );
      const bankOpt = options.find((o) => o.value !== "-1" && o.text.includes("기업은행")) ?? options.find((o) => o.value !== "-1");
      if (!bankOpt) throw new Error("은행 옵션 없음");
      await page.selectOption("#bankaccount", bankOpt.value);

      // 입금자명
      await page.fill("#pname", acc.name);
      await delay(200);

      // 결제
      await page.click("#btn_payment");
      await delay(5000);

      const orderUrl = page.url();
      if (orderUrl.includes("orderform")) {
        throw new Error("결제 실패 - 주문 페이지에서 벗어나지 못함");
      }

      result.purchased = true;
      console.log(`  ${tag} 구매 완료!`);

      // 구매카운트 증가
      const allAccounts = loadAccounts();
      const target = allAccounts.find((a: any) => a.id === acc.id);
      if (target) {
        target.purchaseCount = (target.purchaseCount || 0) + 1;
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(allAccounts, null, 2), "utf-8");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.error = msg;
      console.log(`  ${tag} 에러: ${msg}`);
    } finally {
      await page.close();
      await context.close();
      results.push(result);
    }

    if (i < TARGETS.length - 1) {
      const gap = randomInt(5, 15);
      console.log(`  대기 ${gap}초...`);
      await delay(gap * 1000);
    }
  }

  await browser.close();

  console.log("\n\n========================================");
  console.log("        구매 보충 결과 보고");
  console.log("========================================");
  const buyOk = results.filter((r) => r.purchased).length;
  console.log(`구매 성공: ${buyOk}/${TARGETS.length}`);
  results.forEach((r, i) => {
    const status = r.purchased ? "OK" : "FAIL";
    console.log(`  [${i + 1}] ${r.id} (${r.name}) [${status}]${r.error ? ` | ${r.error}` : ""}`);
  });
  console.log("\n완료!");
};

run().catch(console.error);
