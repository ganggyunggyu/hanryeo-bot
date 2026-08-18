import { getAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/24/display/1/";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const loadAccounts = () => {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
};

// 전체 계정 + 직접 작성한 주소
// addrSearch: 카카오 검색어, addrDetail: 상세주소, fullAddr: 시트용 전체주소
const ALL_ACCOUNTS = [
  {
    id: "namu2972", name: "강지영",
    addrSearch: "동소문로20길 37",
    addrDetail: "3층",
    fullAddr: "서울특별시 성북구 동소문로20길 37 3층",
  },
  {
    id: "jiyoung4433", name: "서영숙",
    addrSearch: "정조로 900",
    addrDetail: "104동 903호",
    fullAddr: "경기도 수원시 장안구 정조로 900 104동 903호",
  },
  {
    id: "goodday9774", name: "정태호",
    addrSearch: "명륜로98번길 11",
    addrDetail: "2층 202호",
    fullAddr: "부산광역시 동래구 명륜로98번길 11 2층 202호",
  },
];

// 이번에 구매할 계정
const TARGETS = [
  { ...ALL_ACCOUNTS[0], password: getAccountPassword() },
];

// === Google Sheets ===
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SHEET_NAME = "리뷰 계정";

const updateSheet = async (data: { name: string; id: string; fullAddr: string; purchasedAt: string }[]) => {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:Z1000`,
  });

  const header = ["수취인", "참여ID", "배송지", "구매일시"];
  const rows = data.map((r) => [r.name, r.id, r.fullAddr, r.purchasedAt]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [header, ...rows] },
  });

  console.log("\n시트 업데이트 완료!");
  [header, ...rows].forEach((row, i) => console.log(`  [${i}] ${row.join(" | ")}`));
};

const run = async () => {
  const browser = await chromium.launch({ headless: false });
  const now = () => new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const purchaseResults: Record<string, { fullAddr: string; purchasedAt: string }> = {};

  for (let i = 0; i < TARGETS.length; i++) {
    const acc = TARGETS[i];
    const tag = `[${i + 1}/${TARGETS.length}]`;

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
    });
    const page = await context.newPage();

    page.on("dialog", async (d) => {
      console.log(`  ${tag} [팝업] ${d.type()}: ${d.message().slice(0, 60)}`);
      // "장바구니에 N개 있습니다" → dismiss(취소) = 현재 선택한 수량만 구매
      if (d.message().includes("장바구니")) {
        await d.dismiss();
      } else {
        await d.accept();
      }
    });

    try {
      console.log(`\n${tag} ===== 구매: ${acc.name} (${acc.id}) =====`);

      // 로그인
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

      // 상품 → 옵션 → 구매
      await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded" });
      await delay(2000);
      await page.selectOption("#product_option_id1", { label: "한려담원 흑염소진액" });
      console.log(`  ${tag} 옵션1 선택`);
      await delay(2000);
      await page.selectOption("#product_option_id2", { label: "30포" });
      console.log(`  ${tag} 옵션2 선택`);
      await delay(1000);

      await page.evaluate(() => {
        const btn = document.querySelector('a.btnSubmit[onclick*="product_submit(1"]') as HTMLElement;
        if (btn) btn.click();
      });
      await delay(5000);
      console.log(`  ${tag} 주문 페이지 도달: ${page.url()}`);

      // "새로입력" 탭 클릭 (이전 주문이 있으면 "최근 배송지"가 기본)
      await page.evaluate(() => {
        const tabs = document.querySelectorAll(".ec-base-tab a, .ec-base-tab li a, [class*='ship'] a");
        for (const tab of tabs) {
          if (tab.textContent?.includes("새로입력") || tab.textContent?.includes("직접입력")) {
            (tab as HTMLElement).click();
            return;
          }
        }
        // fallback: newShipArea 직접 표시
        const newArea = document.querySelector(".newShipArea") as HTMLElement;
        const recentArea = document.querySelector(".recentShipArea") as HTMLElement;
        if (newArea) newArea.style.display = "block";
        if (recentArea) recentArea.style.display = "none";
      });
      await delay(1500);
      console.log(`  ${tag} 새로입력 탭 전환`);

      // 주소검색 버튼 강제 표시 + 클릭
      await page.evaluate(() => {
        const btn = document.querySelector("#btn_search_rzipcode") as HTMLElement;
        if (btn) {
          btn.scrollIntoView({ behavior: "instant", block: "center" });
          btn.click();
        }
      });
      await delay(500);
      console.log(`  ${tag} 주소검색 클릭`);

      // 카카오 프레임 대기
      let kakaoFrame = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await delay(500);
        kakaoFrame = page.frames().find((f) => f.url().includes("postcode.map.kakao.com"));
        if (kakaoFrame) break;
      }
      if (!kakaoFrame) throw new Error("카카오 프레임 못 찾음");

      const searchInput = await kakaoFrame.waitForSelector("input#region_name", { timeout: 10000 });
      await searchInput.click({ force: true });
      await searchInput.fill(acc.addrSearch);
      await delay(500);
      await searchInput.press("Enter");
      await delay(3000);

      const addrResult = await kakaoFrame.$("span.txt_address button.link_post") ?? await kakaoFrame.$(".link_post");
      if (!addrResult) throw new Error("주소 검색 결과 없음");
      await addrResult.click();
      await delay(3000);

      // 기본주소 읽기 + 상세주소 입력
      const baseAddr = await page.$eval("#raddr1", (el) => (el as HTMLInputElement).value).catch(() => acc.addrSearch);
      await page.fill("#raddr2", acc.addrDetail);
      await delay(300);

      const fullAddr = `${baseAddr} ${acc.addrDetail}`;
      console.log(`  ${tag} 주소: ${fullAddr}`);

      // 은행
      const bankOptions = await page.$$eval("#bankaccount option", (opts) =>
        opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
      );
      const bankOpt = bankOptions.find((o) => o.value !== "-1" && o.text.includes("기업은행"))
        ?? bankOptions.find((o) => o.value !== "-1");
      if (!bankOpt) throw new Error("은행 옵션 없음");
      await page.selectOption("#bankaccount", bankOpt.value);

      // 입금자명
      await page.fill("#pname", acc.name);
      await delay(200);

      // 결제
      await page.click("#btn_payment");
      await delay(5000);

      if (page.url().includes("orderform")) throw new Error("결제 실패");

      console.log(`  ${tag} 구매 완료!`);

      purchaseResults[acc.id] = { fullAddr, purchasedAt: now() };

      // 구매카운트
      const allAccounts = loadAccounts();
      const target = allAccounts.find((a: Record<string, unknown>) => a.id === acc.id);
      if (target) {
        (target as Record<string, number>).purchaseCount = ((target as Record<string, number>).purchaseCount || 0) + 1;
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(allAccounts, null, 2), "utf-8");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${tag} 에러: ${msg}`);
      purchaseResults[acc.id] = {
        fullAddr: `${acc.addrSearch} ${acc.addrDetail}`,
        purchasedAt: "구매실패",
      };
    } finally {
      await page.close();
      await context.close();
    }

    if (i < TARGETS.length - 1) {
      const gap = randomInt(5, 10);
      console.log(`  대기 ${gap}초...`);
      await delay(gap * 1000);
    }
  }

  await browser.close();

  // 시트 업데이트 (전체 계정, 고정 주소 사용)
  const sheetData = ALL_ACCOUNTS.map((acc) => {
    const result = purchaseResults[acc.id];
    return {
      name: acc.name,
      id: acc.id,
      fullAddr: acc.fullAddr,
      purchasedAt: result?.purchasedAt ?? "",
    };
  });

  await updateSheet(sheetData);

  console.log("\n========================================");
  console.log("           최종 결과");
  console.log("========================================");
  sheetData.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.name} (${r.id}) | ${r.fullAddr} | ${r.purchasedAt}`);
  });
};

run().catch(console.error);
