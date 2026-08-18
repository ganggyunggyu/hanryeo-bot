import { getOrderPhone } from "./src/shared/config/contact";
import { getLegacyAccountPassword } from "./src/shared/config/credentials";
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

const saveAccount = (acc: Record<string, unknown>) => {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const accounts = loadAccounts();
  accounts.push(acc);
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
};

const TARGETS_FILE = path.resolve(process.cwd(), "accounts/custom-targets.json");

type CustomTarget = {
  id: string;
  name: string;
  email: string;
  gender: "female" | "male";
};

const loadTargets = (): CustomTarget[] => {
  if (!fs.existsSync(TARGETS_FILE)) {
    throw new Error(
      "accounts/custom-targets.json 파일이 없습니다. accounts/custom-targets.example.json을 복사해 대상 계정을 채우세요."
    );
  }

  return JSON.parse(fs.readFileSync(TARGETS_FILE, "utf-8"));
};

const TARGETS = loadTargets().map((target) => ({
  ...target,
  password: getLegacyAccountPassword(),
}));

const run = async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "true" });
  const results: { id: string; name: string; joined: boolean; purchased: boolean; error?: string }[] = [];

  for (let i = 0; i < TARGETS.length; i++) {
    const acc = TARGETS[i];
    const tag = `[${i + 1}/${TARGETS.length}]`;
    const result = { id: acc.id, name: acc.name, joined: false, purchased: false, error: undefined as string | undefined };

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
      // ===== 가입 =====
      console.log(`\n${tag} ===== 가입 시작: ${acc.name} (${acc.id}) =====`);

      await page.goto(`${BASE_URL}/member/agreement.html`, { waitUntil: "domcontentloaded" });
      await delay(1000);
      await page.click("#sAgreeAllChecked");
      await delay(500);
      await page.click("button.btnSubmitFix");
      await page.waitForURL("**/member/join.html**", { timeout: 10000 });
      console.log(`  ${tag} 약관동의 완료`);

      await page.fill("#member_id", acc.id);
      await delay(300);
      await page.fill("#passwd", acc.password);
      await delay(200);
      await page.fill("#user_passwd_confirm", acc.password);
      await delay(200);
      await page.fill("#name", acc.name);
      await delay(200);
      await page.selectOption("#mobile1", "010");
      await delay(100);
      await page.fill("#mobile2", "8019");
      await delay(100);
      await page.fill("#mobile3", "7134");
      await delay(200);
      await page.fill("#email1", acc.email);
      await delay(300);

      await page.evaluate(() => {
        const fn = (window as any).memberJoinAction;
        if (fn) fn();
      });
      await delay(2000);

      const confirmBtn = await page.$("#ec_shop_confirm-checkingjoininfo_action");
      if (confirmBtn) {
        await confirmBtn.click();
        await delay(3000);
      }

      const joinUrl = page.url();
      const joinOk = joinUrl.includes("join_result") || joinUrl.includes("returnUrl") || joinUrl === `${BASE_URL}/`;

      if (!joinOk) {
        throw new Error(`가입 실패 - URL: ${joinUrl}`);
      }

      result.joined = true;
      console.log(`  ${tag} 가입 완료: ${acc.name} (${acc.id})`);

      saveAccount({
        id: acc.id,
        password: acc.password,
        name: acc.name,
        email: acc.email,
        phone: getOrderPhone(),
        gender: acc.gender,
        reviewCount: 0,
        purchaseCount: 0,
        createdAt: new Date().toISOString(),
      });

      // ===== 로그인 =====
      console.log(`  ${tag} 로그인 확인`);
      await page.goto(`${BASE_URL}/member/login.html`, { waitUntil: "domcontentloaded" });
      await delay(1500);

      const isLoginPage = await page.$("#member_id");
      if (isLoginPage) {
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
      } else {
        console.log(`  ${tag} 이미 로그인 상태`);
      }

      // ===== 구매 =====
      console.log(`  ${tag} 구매 시작`);

      await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded" });
      await delay(2000);
      await page.evaluate(() => {
        const btn = document.querySelector('a.btnSubmit[onclick*="product_submit"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(3000);
      console.log(`  ${tag} 주문 페이지 도달`);

      // 주소
      await page.click("#btn_search_rzipcode");
      await delay(3000);
      const kakaoFrame = page.frames().find((f) => f.url().includes("postcode.map.daum.net"));
      if (!kakaoFrame) throw new Error("카카오 프레임 못 찾음");

      const searchInput = await kakaoFrame.waitForSelector("input#region_name", { timeout: 5000 });
      await searchInput.click({ force: true });
      await searchInput.fill(ADDRESS);
      await delay(500);
      await searchInput.press("Enter");
      await delay(3000);

      const addrResult = await kakaoFrame.$("span.txt_address button.link_post");
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
  console.log("        커스텀 계정 결과 보고");
  console.log("========================================");
  const joinOk = results.filter((r) => r.joined).length;
  const buyOk = results.filter((r) => r.purchased).length;
  const failed = results.filter((r) => !r.joined || !r.purchased);

  console.log(`가입 성공: ${joinOk}/${TARGETS.length}`);
  console.log(`구매 성공: ${buyOk}/${TARGETS.length}`);

  if (failed.length > 0) {
    console.log("\n--- 실패 목록 ---");
    failed.forEach((r) => {
      console.log(`  ${r.id} (${r.name}) - 가입:${r.joined ? "O" : "X"} 구매:${r.purchased ? "O" : "X"} | ${r.error ?? ""}`);
    });
  }

  console.log("\n--- 전체 계정 ---");
  results.forEach((r, i) => {
    const status = r.joined && r.purchased ? "OK" : "FAIL";
    console.log(`  [${i + 1}] ${r.id} (${r.name}) [${status}]`);
  });

  console.log("\n완료!");
};

run().catch(console.error);
