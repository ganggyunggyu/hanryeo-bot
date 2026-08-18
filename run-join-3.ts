import { getAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://hanryeodamwon.com";
const PASSWORD = getAccountPassword();
const TOTAL = 3;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDigits = (len: number) =>
  Array.from({ length: len }, () => String(Math.floor(Math.random() * 10))).join("");

const SURNAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "오", "한", "신", "서", "권", "황", "안", "송", "류", "홍",
];
const FEMALE_GIVEN = [
  "영숙", "미경", "정희", "순옥", "은주", "경미", "현정", "선미",
  "지영", "미숙", "정숙", "은경", "보경", "경희", "옥순", "정순",
  "소영", "유진", "하영", "서연", "지혜", "은정", "수진", "혜진",
];
const MALE_GIVEN = [
  "경규", "상현", "동훈", "진우", "성호", "재영", "영철", "태호",
  "정수", "기호", "상철", "영호", "종수", "광수", "병철", "태영",
  "준혁", "민재", "지훈", "성민", "현수", "동현", "승현", "재민",
];
const ID_PREFIXES = [
  "mikyung", "eunju", "hyejin", "sunmi", "jiyoung",
  "youngsuk", "junghee", "kyungmi", "suyeon", "bokyung",
  "sarang", "haengbok", "haneul", "baram", "namu",
  "hiking", "garden", "cook", "yoga", "travel",
  "happymom", "lovelife", "goodday", "myhouse", "ourfam",
];
const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com"];

const generateAccount = () => {
  const gender = Math.random() < 0.7 ? "female" as const : "male" as const;
  const surname = randomPick(SURNAMES);
  const given = randomPick(gender === "female" ? FEMALE_GIVEN : MALE_GIVEN);
  const name = `${surname}${given}`;
  const id = `${randomPick(ID_PREFIXES)}${randomInt(10, 9999)}`;
  const email = `${id}@${randomPick(EMAIL_DOMAINS)}`;
  const mobile2 = randomDigits(4);
  const mobile3 = randomDigits(4);
  return { id, password: PASSWORD, name, email, gender, mobile2, mobile3 };
};

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

const run = async () => {
  const browser = await chromium.launch({ headless: false });
  const results: { id: string; name: string; joined: boolean; error?: string }[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const acc = generateAccount();
    const tag = `[${i + 1}/${TOTAL}]`;
    const result = { id: acc.id, name: acc.name, joined: false, error: undefined as string | undefined };

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
    });
    const page = await context.newPage();

    page.on("dialog", async (d) => {
      console.log(`  ${tag} [팝업] ${d.type()}: ${d.message()}`);
      await d.accept();
    });

    try {
      console.log(`\n${tag} ===== 가입 시작: ${acc.name} (${acc.id}) / PW: ${acc.password} =====`);

      // 약관동의
      await page.goto(`${BASE_URL}/member/agreement.html`, { waitUntil: "domcontentloaded" });
      await delay(1000);
      await page.click("#sAgreeAllChecked");
      await delay(500);
      await page.click("button.btnSubmitFix");
      await page.waitForURL("**/member/join.html**", { timeout: 10000 });
      console.log(`  ${tag} 약관동의 완료`);

      // 가입폼
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
      await page.fill("#mobile2", acc.mobile2);
      await delay(100);
      await page.fill("#mobile3", acc.mobile3);
      await delay(200);
      await page.fill("#email1", acc.email);
      await delay(300);

      await page.evaluate(() => {
        const fn = (window as unknown as Record<string, unknown>).memberJoinAction as (() => void) | undefined;
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
        phone: `010-${acc.mobile2}-${acc.mobile3}`,
        gender: acc.gender,
        reviewCount: 0,
        purchaseCount: 0,
        createdAt: new Date().toISOString(),
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.error = msg;
      console.log(`  ${tag} 에러: ${msg}`);
    } finally {
      await page.close();
      await context.close();
      results.push(result);
    }

    if (i < TOTAL - 1) {
      const gap = randomInt(3, 8);
      console.log(`  대기 ${gap}초...`);
      await delay(gap * 1000);
    }
  }

  await browser.close();

  console.log("\n========================================");
  console.log("           가입 결과");
  console.log("========================================");
  const ok = results.filter((r) => r.joined).length;
  console.log(`성공: ${ok}/${TOTAL}`);

  results.forEach((r, i) => {
    const status = r.joined ? "OK" : "FAIL";
    console.log(`  [${i + 1}] ${r.id} (${r.name}) [${status}]${r.error ? ` - ${r.error}` : ""}`);
  });

  console.log("\n완료!");
};

run().catch(console.error);
