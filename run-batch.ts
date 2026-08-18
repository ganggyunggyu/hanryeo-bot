import { getLegacyAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/24/display/1/";
const ADDRESS = "매산로116번길23-4";
const PASSWORD = getLegacyAccountPassword();
const TOTAL = 40;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomString = (len: number, chars: string) =>
  Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

// --- 데이터 생성 ---
const SURNAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "오", "한", "신", "서", "권", "황", "안", "송", "류", "홍",
  "전", "문", "배", "양", "남", "구", "민", "유", "손", "노",
  "하", "곽", "성", "차", "주", "우", "라", "진", "방", "공",
];
const FEMALE_GIVEN = [
  "영숙", "미경", "정희", "순옥", "은주", "경미", "현정", "선미",
  "지영", "미숙", "정숙", "은경", "숙경", "영미", "춘희", "명숙",
  "보경", "경희", "옥순", "정순", "영자", "순자", "명자", "춘자",
  "복순", "말순", "길순", "순영", "옥희", "정자", "미자", "영희",
  "경숙", "혜숙", "인숙", "귀순", "말자", "분자", "난희", "선옥",
  "소영", "유진", "하영", "서연", "지혜", "은정", "수진", "혜진",
  "미선", "영은", "지은", "수경", "현숙", "은미", "지현", "다영",
  "선영", "정은", "혜원", "나영",
];
const MALE_GIVEN = [
  "경규", "상현", "동훈", "진우", "성호", "재영", "영철", "태호",
  "정수", "기호", "상철", "영호", "종수", "광수", "병철", "태영",
  "성구", "현우", "종호", "만수", "용호", "재호", "석호", "동수",
  "상호", "영수", "기철", "성진", "동식", "만호", "재원", "용수",
  "준혁", "민재", "지훈", "성민", "현수", "동현", "승현", "재민",
  "태민", "유찬", "민호", "정민", "시우", "준서", "도현", "건우",
  "우진", "세훈", "하준", "예준",
];
const ID_PREFIXES = [
  // 이름 로마자
  "mikyung", "eunju", "hyejin", "sunmi", "jiyoung",
  "youngsuk", "junghee", "kyungmi", "suyeon", "bokyung",
  "misook", "jungsook", "myungja", "soonyee", "oksoon",
  "youngho", "jongsoo", "kwangsoo", "sunghoo", "taeyoung",
  // 한국어 로마자
  "sarang", "haengbok", "haneul", "baram", "namu",
  "ddalgi", "ggotip", "haru", "bom", "gaeul",
  "noeul", "byeol", "dalnim", "param", "solip",
  "nunkkot", "bada", "gureum", "haetsal", "saebyeok",
  // 취미/일상
  "hiking", "garden", "cook", "yoga", "travel",
  "morning", "nature", "health", "smile", "dream",
  "running", "reading", "fishing", "camping", "cycling",
  "walking", "singing", "dancing", "painting", "knitting",
  // 생활 밀착형
  "happymom", "lovelife", "goodday", "myhouse", "ourfam",
  "prettymom", "warmheart", "sweetmom", "homecook", "walkday",
  "bestlife", "coolmom", "myhobby", "funday", "joyful",
  "smilemom", "greenlife", "sunnyday", "calmday", "freshair",
];
const EMAIL_DOMAINS = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "kakao.com"];
const EMAIL_PREFIXES = ["love", "my", "the", "hi", "go", "so", "do", "la", "su", "ha", "ye", "bo", "na", "da"];

const generateAccount = () => {
  const gender = Math.random() < 0.7 ? "female" as const : "male" as const;
  const surname = randomPick(SURNAMES);
  const given = randomPick(gender === "female" ? FEMALE_GIVEN : MALE_GIVEN);
  const name = `${surname}${given}`;
  const id = `${randomPick(ID_PREFIXES)}${randomInt(10, 9999)}`;
  const domain = randomPick(EMAIL_DOMAINS);
  const style = randomInt(1, 3);
  const email =
    style === 1 ? `${id}@${domain}` :
    style === 2 ? `${randomPick(EMAIL_PREFIXES)}${id.slice(0, 4)}${randomInt(10, 999)}@${domain}` :
    `${id}${randomInt(60, 85)}@${domain}`;
  return { id, password: PASSWORD, name, email, gender, mobile2: "8019", mobile3: "7134" };
};

// --- JSON 저장 ---
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

// --- 메인 ---
const run = async () => {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "true" });

  const results: { id: string; name: string; joined: boolean; purchased: boolean; error?: string }[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const acc = generateAccount();
    const tag = `[${i + 1}/${TOTAL}]`;
    const result = { id: acc.id, name: acc.name, joined: false, purchased: false, error: undefined as string | undefined };

    // 계정마다 새 context (세션 격리)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
    });
    const page = await context.newPage();

    page.on("dialog", async (d) => {
      console.log(`  ${tag} [팝업] ${d.type()}: ${d.message()}`);
      if (d.type() === "confirm") await d.accept();
      else await d.accept();
    });

    try {
      // ===== 가입 =====
      console.log(`\n${tag} ===== 가입 시작: ${acc.name} (${acc.id}) =====`);

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

      // 계정 저장
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

      // ===== 로그인 (가입 후 자동 로그인 안 된 경우만) =====
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

      // 상품 → BUY
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

    // 계정 간 자연스러운 텀 (5~15초)
    if (i < TOTAL - 1) {
      const gap = randomInt(5, 15);
      console.log(`  대기 ${gap}초...`);
      await delay(gap * 1000);
    }
  }

  await browser.close();

  // ===== 결과 보고 =====
  console.log("\n\n========================================");
  console.log("           최종 결과 보고");
  console.log("========================================");
  const joinOk = results.filter((r) => r.joined).length;
  const buyOk = results.filter((r) => r.purchased).length;
  const failed = results.filter((r) => !r.joined || !r.purchased);

  console.log(`가입 성공: ${joinOk}/${TOTAL}`);
  console.log(`구매 성공: ${buyOk}/${TOTAL}`);

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
