/**
 * 한려담원 일일 파이프라인
 * 계정 생성 → 구매 → 구글 시트 기록
 *
 * Usage:
 *   npx tsx run-daily-pipeline.ts              # 1개 신규 계정
 *   npx tsx run-daily-pipeline.ts 3            # 3개 신규 계정
 *   npx tsx run-daily-pipeline.ts jiyoung4433  # 기존 계정 구매
 */
import { getOrderPhone, getOrderPhoneDigits } from "./src/shared/config/contact";
import { getAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// === 상수 ===
const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/24/display/1/";
const PASSWORD = getAccountPassword();
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");

// === 유틸 ===
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDigits = (len: number) =>
  Array.from({ length: len }, () => String(Math.floor(Math.random() * 10))).join("");
const now = () => new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

// === 데이터 생성 ===
const SURNAMES = ["김","이","박","최","정","강","조","윤","장","임","오","한","신","서","권","황","안","송","류","홍"];
const FEMALE_GIVEN = ["영숙","미경","정희","순옥","은주","경미","현정","선미","지영","미숙","정숙","은경","보경","경희","옥순","정순","소영","유진","하영","서연","지혜","은정","수진","혜진"];
const MALE_GIVEN = ["경규","상현","동훈","진우","성호","재영","영철","태호","정수","기호","상철","영호","종수","광수","병철","태영","준혁","민재","지훈","성민","현수","동현","승현","재민"];
const ID_PREFIXES = ["mikyung","eunju","hyejin","sunmi","jiyoung","youngsuk","junghee","kyungmi","suyeon","bokyung","sarang","haengbok","haneul","baram","namu","hiking","garden","cook","yoga","travel","happymom","lovelife","goodday","myhouse","ourfam"];
const EMAIL_DOMAINS = ["gmail.com","naver.com","daum.net","hanmail.net","kakao.com"];

// 현실적인 주거 주소 풀 (검색어 + 상세 + 전체)
const ADDRESS_POOL = [
  { search: "동소문로20길 37", detail: "3층", full: "서울특별시 성북구 동소문로20길 37 3층" },
  { search: "정조로 900", detail: "104동 903호", full: "경기도 수원시 장안구 정조로 900 104동 903호" },
  { search: "명륜로98번길 11", detail: "2층 202호", full: "부산광역시 동래구 명륜로98번길 11 2층 202호" },
  { search: "충렬대로 245", detail: "102동 504호", full: "경상남도 창원시 마산합포구 충렬대로 245 102동 504호" },
  { search: "호반로 30", detail: "2층", full: "강원도 춘천시 호반로 30 2층" },
  { search: "달구벌대로 2100", detail: "105동 807호", full: "대구광역시 수성구 달구벌대로 2100 105동 807호" },
  { search: "무등로 227", detail: "301호", full: "광주광역시 북구 무등로 227 301호" },
  { search: "중앙로 79", detail: "4층", full: "제주특별자치도 제주시 중앙로 79 4층" },
  { search: "월드컵로 120", detail: "502호", full: "서울특별시 마포구 월드컵로 120 502호" },
  { search: "번영로 125", detail: "103동 605호", full: "부산광역시 해운대구 번영로 125 103동 605호" },
  { search: "동백중앙로 16", detail: "201동 1503호", full: "경기도 용인시 기흥구 동백중앙로 16 201동 1503호" },
  { search: "유성대로 808", detail: "102동 301호", full: "대전광역시 유성구 유성대로 808 102동 301호" },
  { search: "봉영로 1600", detail: "203동 804호", full: "경기도 수원시 영통구 봉영로 1600 203동 804호" },
  { search: "고산로 51", detail: "3층", full: "인천광역시 연수구 고산로 51 3층" },
  { search: "테헤란로 152", detail: "3층", full: "서울특별시 강남구 테헤란로 152 3층" },
  { search: "수성로 200", detail: "102동 803호", full: "대구광역시 수성구 수성로 200 102동 803호" },
  // 백제대로 2148 제거 — 카카오 검색 실패
  { search: "북부순환로 226", detail: "2층 201호", full: "서울특별시 노원구 북부순환로 226 2층 201호" },
  { search: "해운대로 612", detail: "4층", full: "부산광역시 해운대구 해운대로 612 4층" },
  { search: "판교역로 235", detail: "103동 1102호", full: "경기도 성남시 분당구 판교역로 235 103동 1102호" },
  { search: "중앙대로 1691", detail: "301호", full: "부산광역시 부산진구 중앙대로 1691 301호" },
  { search: "공항로 301", detail: "5층", full: "제주특별자치도 제주시 공항로 301 5층" },
  { search: "남부순환로 2606", detail: "103동 702호", full: "서울특별시 서초구 남부순환로 2606 103동 702호" },
  { search: "위례대로 190", detail: "201동 905호", full: "경기도 성남시 수정구 위례대로 190 201동 905호" },
  { search: "올림픽로 300", detail: "104동 1503호", full: "서울특별시 송파구 올림픽로 300 104동 1503호" },
  // 경인로 662 제거 — 카카오 검색 실패
  { search: "동일로 1337", detail: "201동 803호", full: "서울특별시 노원구 동일로 1337 201동 803호" },
  { search: "관악로 152", detail: "2층", full: "서울특별시 관악구 관악로 152 2층" },
  { search: "천안대로 1516", detail: "103동 906호", full: "충청남도 천안시 서북구 천안대로 1516 103동 906호" },
  { search: "전주천동로 20", detail: "4층", full: "전북특별자치도 전주시 완산구 전주천동로 20 4층" },
  // 시청대로 151 제거 — 카카오 검색 실패
  { search: "중앙로 170", detail: "301호", full: "경기도 의정부시 중앙로 170 301호" },
  // 포항대로 57 제거 — 카카오 검색 실패
  { search: "킨텍스로 217", detail: "201동 705호", full: "경기도 고양시 일산서구 킨텍스로 217 201동 705호" },
  { search: "상당로 314", detail: "5층", full: "충청북도 청주시 상당구 상당로 314 5층" },
  { search: "영등포로 380", detail: "103동 402호", full: "서울특별시 영등포구 영등포로 380 103동 402호" },
  { search: "동작대로 29", detail: "3층", full: "서울특별시 동작구 동작대로 29 3층" },
  { search: "강남대로 396", detail: "5층", full: "서울특별시 강남구 강남대로 396 5층" },
  { search: "광나루로 441", detail: "102동 807호", full: "서울특별시 광진구 광나루로 441 102동 807호" },
  { search: "한강대로 372", detail: "3층", full: "서울특별시 용산구 한강대로 372 3층" },
  { search: "성내로 28", detail: "201동 1105호", full: "서울특별시 강동구 성내로 28 201동 1105호" },
  { search: "중앙로 261", detail: "4층", full: "경기도 부천시 중앙로 261 4층" },
  { search: "미사강변대로 190", detail: "103동 902호", full: "경기도 하남시 미사강변대로 190 103동 902호" },
  { search: "일산로 138", detail: "2층", full: "경기도 고양시 일산동구 일산로 138 2층" },
  { search: "학익대로 18", detail: "3층", full: "인천광역시 미추홀구 학익대로 18 3층" },
  { search: "동해대로 6316", detail: "4층", full: "울산광역시 울주군 동해대로 6316 4층" },
  { search: "원효로90길 11", detail: "3층 301호", full: "서울특별시 용산구 원효로90길 11 3층 301호" },
  { search: "도산대로 317", detail: "4층", full: "서울특별시 강남구 도산대로 317 4층" },
  { search: "양재대로 932", detail: "102동 503호", full: "서울특별시 서초구 양재대로 932 102동 503호" },
  { search: "통일로 1414", detail: "3층", full: "경기도 파주시 통일로 1414 3층" },
  { search: "중앙로 1209", detail: "201동 804호", full: "경기도 광명시 중앙로 1209 201동 804호" },
  // 수지로 225 제거 — 카카오 검색 실패
  // 호매실로 138 제거 — 카카오 검색 실패
  { search: "경수대로 262", detail: "4층", full: "경기도 군포시 경수대로 262 4층" },
  { search: "중앙로 1091", detail: "102동 607호", full: "경기도 광명시 중앙로 1091 102동 607호" },
  { search: "범어로 30", detail: "3층", full: "대구광역시 수성구 범어로 30 3층" },
  { search: "금남로 160", detail: "5층", full: "광주광역시 동구 금남로 160 5층" },
  // 해수로 99 제거 — 카카오 검색 실패 (존재하지 않는 주소)
  { search: "산격로 51", detail: "4층", full: "대구광역시 북구 산격로 51 4층" },
  { search: "대학로 291", detail: "3층", full: "경상북도 경산시 대학로 291 3층" },
  // 갈마중로 99 제거 — 카카오 검색 실패
  { search: "문수로 166", detail: "2층", full: "울산광역시 남구 문수로 166 2층" },
  { search: "센텀중앙로 48", detail: "102동 1502호", full: "부산광역시 해운대구 센텀중앙로 48 102동 1502호" },
  // 진영읍 김해대로 495 제거 — 카카오 검색 실패
  { search: "능동로 209", detail: "2층 201호", full: "서울특별시 광진구 능동로 209 2층 201호" },
  { search: "신촌로 104", detail: "3층", full: "서울특별시 마포구 신촌로 104 3층" },
  // 2026-04-16 추가 (dorojuso.kr 검증)
  { search: "신림로 185", detail: "101동 302호", full: "서울특별시 관악구 신림로 185 101동 302호" },
  { search: "노원로 569", detail: "2동 405호", full: "서울특별시 노원구 노원로 569 2동 405호" },
  { search: "권광로260번길 36", detail: "101동 1004호", full: "경기도 수원시 영통구 권광로260번길 36 101동 1004호" },
  { search: "세월천로 16", detail: "102동 503호", full: "인천광역시 부평구 세월천로 16 102동 503호" },
  { search: "고분로 200", detail: "3동 201호", full: "부산광역시 연제구 고분로 200 3동 201호" },
  { search: "둔산로 223", detail: "201동 602호", full: "대전광역시 서구 둔산로 223 201동 602호" },
  { search: "용산2로 30", detail: "103동 704호", full: "대전광역시 유성구 용산2로 30 103동 704호" },
  { search: "동운로 130", detail: "2동 803호", full: "광주광역시 북구 동운로 130 2동 803호" },
  // 2026-04-19 추가 (dorojuso.kr 검증)
  { search: "마포대로 195", detail: "101동 501호", full: "서울특별시 마포구 마포대로 195 101동 501호" },
  { search: "올림픽로 99", detail: "101동 302호", full: "서울특별시 송파구 올림픽로 99 101동 302호" },
  { search: "올림픽로 435", detail: "301동 1102호", full: "서울특별시 송파구 올림픽로 435 301동 1102호" },
  { search: "효원로 363", detail: "133동 705호", full: "경기도 수원시 영통구 효원로 363 133동 705호" },
  { search: "수정로 319", detail: "114동 803호", full: "경기도 성남시 수정구 수정로 319 114동 803호" },
  { search: "검단로 836", detail: "122동 201호", full: "인천광역시 서구 검단로 836 122동 201호" },
  { search: "후석로 325", detail: "101동 602호", full: "강원특별자치도 춘천시 후석로 325 101동 602호" },
  { search: "서원대로 35", detail: "102동 401호", full: "강원특별자치도 원주시 서원대로 35 102동 401호" },
  { search: "경강로 2267", detail: "3동 201호", full: "강원특별자치도 강릉시 경강로 2267 3동 201호" },
  { search: "2순환로 1225", detail: "102동 304호", full: "충청북도 청주시 흥덕구 2순환로 1225 102동 304호" },
  { search: "불당26로 50", detail: "203동 901호", full: "충청남도 천안시 서북구 불당26로 50 203동 901호" },
  { search: "보람동로 14", detail: "814동 502호", full: "세종특별자치시 보람동로 14 814동 502호" },
  { search: "엑스포로 448", detail: "209동 701호", full: "대전광역시 유성구 엑스포로 448 209동 701호" },
  { search: "백제대로 160", detail: "102동 203호", full: "전북특별자치도 전주시 완산구 백제대로 160 102동 203호" },
  { search: "원가곡2길 17", detail: "103동 405호", full: "전라남도 순천시 원가곡2길 17 103동 405호" },
  { search: "달구벌대로 2367", detail: "나동 401호", full: "대구광역시 수성구 달구벌대로 2367 나동 401호" },
  { search: "좌동순환로 118", detail: "201동 303호", full: "부산광역시 해운대구 좌동순환로 118 201동 303호" },
  { search: "온천장로 75", detail: "101동 1001호", full: "부산광역시 동래구 온천장로 75 101동 1001호" },
  { search: "삼산로 204", detail: "105동 802호", full: "울산광역시 남구 삼산로 204 105동 802호" },
  { search: "원이대로 774", detail: "509동 501호", full: "경상남도 창원시 성산구 원이대로 774 509동 501호" },
  // 2026-04-24 추가 (Kakao 우편번호 iframe 검증)
  { search: "강남대로12길 6", detail: "301호", full: "서울특별시 서초구 강남대로12길 6 301호" },
  { search: "강남대로12길 8", detail: "402호", full: "서울특별시 서초구 강남대로12길 8 402호" },
  { search: "강남대로12길 11", detail: "201호", full: "서울특별시 서초구 강남대로12길 11 201호" },
  { search: "강남대로12길 15", detail: "502호", full: "서울특별시 서초구 강남대로12길 15 502호" },
  { search: "강남대로12길 19", detail: "303호", full: "서울특별시 서초구 강남대로12길 19 303호" },
  { search: "월드컵북로 396", detail: "101동 801호", full: "서울특별시 마포구 월드컵북로 396 101동 801호" },
  { search: "인계로 178", detail: "102동 704호", full: "경기도 수원시 팔달구 인계로 178 102동 704호" },
  { search: "해운대해변로 264", detail: "1203호", full: "부산광역시 해운대구 해운대해변로 264 1203호" },
  { search: "둔산로 100", detail: "401호", full: "대전광역시 서구 둔산로 100 401호" },
  { search: "대구 중구 동성로 50", detail: "501호", full: "대구광역시 중구 동성로 50 501호" },
  { search: "인천 남동구 구월로 107", detail: "103동 605호", full: "인천광역시 남동구 구월로 107 103동 605호" },
  { search: "광주 서구 상무중앙로 62", detail: "702호", full: "광주광역시 서구 상무중앙로 62 702호" },
  { search: "서울 양천구 목동동로 130", detail: "101동 503호", full: "서울특별시 양천구 목동동로 130 101동 503호" },
  { search: "서울 강남구 삼성로 212", detail: "2동 804호", full: "서울특별시 강남구 삼성로 212 2동 804호" },
  { search: "경기 성남시 분당구 불정로 380", detail: "301동 902호", full: "경기도 성남시 분당구 불정로 380 301동 902호" },
  { search: "서울 송파구 양재대로 1218", detail: "214동 1002호", full: "서울특별시 송파구 양재대로 1218 214동 1002호" },
];

// 시트에서 이미 사용된 주소 조회
const getUsedAddresses = async (): Promise<Set<string>> => {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!C2:C1000`,
    });
    const addrs = (res.data.values ?? []).map((r) => r[0]?.trim()).filter(Boolean);
    return new Set(addrs);
  } catch {
    return new Set();
  }
};

const usedAddressesInBatch = new Set<string>();

const generateAccount = (availableAddrs: typeof ADDRESS_POOL = ADDRESS_POOL) => {
  const gender = Math.random() < 0.7 ? "female" as const : "male" as const;
  const surname = randomPick(SURNAMES);
  const given = randomPick(gender === "female" ? FEMALE_GIVEN : MALE_GIVEN);
  const name = `${surname}${given}`;
  const id = `${randomPick(ID_PREFIXES)}${randomInt(10, 9999)}`;
  const email = `${id}@${randomPick(EMAIL_DOMAINS)}`;
  const mobile2 = randomDigits(4);
  const mobile3 = randomDigits(4);

  const remaining = availableAddrs.filter((a) => !usedAddressesInBatch.has(a.full));
  if (remaining.length === 0) throw new Error("사용 가능한 주소가 없음! ADDRESS_POOL 추가 필요");
  const addr = randomPick(remaining);
  usedAddressesInBatch.add(addr.full);

  return { id, password: PASSWORD, name, email, gender, mobile2, mobile3, addr };
};

// === 계정 저장 ===
const loadAccounts = (): Record<string, unknown>[] => {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
};

const saveNewAccount = (acc: Record<string, unknown>) => {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const accounts = loadAccounts();
  accounts.push(acc);
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
};

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
const SHEET_NAME = "가구매 리뷰 계정";

const appendToSheet = async (row: string[]) => {
  // 현재 데이터 읽기
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:D1000`,
  });

  const rows = existing.data.values ?? [];

  // 헤더 없으면 추가
  if (rows.length === 0) {
    rows.push(["수취인", "참여ID", "배송지", "구매일시"]);
  }

  rows.push(row);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  console.log(`  시트 기록: ${row.join(" | ")}`);
};

// === 회원가입 ===
const joinAccount = async (
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  acc: ReturnType<typeof generateAccount>,
  tag: string,
): Promise<boolean> => {
  console.log(`  ${tag} 가입 시작: ${acc.name} (${acc.id})`);

  await page.goto(`${BASE_URL}/member/agreement.html`, { waitUntil: "domcontentloaded" });
  await delay(1000);
  await page.click("#sAgreeAllChecked");
  await delay(500);
  await page.click("button.btnSubmitFix");
  await page.waitForURL("**/member/join.html**", { timeout: 10000 });

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
    const fn = (window as unknown as Record<string, unknown>).memberJoinAction as (() => void) | undefined;
    if (fn) fn();
  });
  await delay(2000);

  try {
    const confirmBtn = await page.$("#ec_shop_confirm-checkingjoininfo_action");
    if (confirmBtn) {
      await confirmBtn.click();
      await delay(3000);
    }
  } catch {
    // 네비게이션으로 context 파괴됨 → 이미 가입 완료
    await delay(2000);
  }

  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const joinUrl = page.url();
  const ok = joinUrl.includes("join_result") || joinUrl.includes("returnUrl") || joinUrl === `${BASE_URL}/`;
  if (ok) console.log(`  ${tag} 가입 완료: ${acc.name} (${acc.id})`);
  return ok;
};

// === 구매 ===
const purchaseAccount = async (
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  accId: string,
  accPassword: string,
  accName: string,
  addr: { search: string; detail: string },
  tag: string,
  skipLogin = false,
): Promise<boolean> => {
  if (!skipLogin) {
    // 로그인
    await page.goto(`${BASE_URL}/member/login.html`, { waitUntil: "domcontentloaded" });
    await delay(1500);
    await page.fill("#member_id", accId);
    await delay(200);
    await page.fill("#member_passwd", accPassword);
    await delay(200);
    await page.evaluate(() => {
      const btn = document.querySelector('a.btnSubmit[onclick*="MemberAction.login"]') as HTMLElement;
      if (btn) btn.click();
    });
    await delay(3000);
  }
  console.log(`  ${tag} 로그인 완료`);

  // 상품 → 옵션 → 구매
  await page.goto(PRODUCT_URL, { waitUntil: "domcontentloaded" });
  await delay(2000);
  await page.selectOption("#product_option_id1", { label: "한려담원 흑염소진액" });
  await delay(2000);
  await page.selectOption("#product_option_id2", { label: "30포" });
  await delay(1000);

  await page.evaluate(() => {
    const btn = document.querySelector('a.btnSubmit[onclick*="product_submit(1"]') as HTMLElement;
    if (btn) btn.click();
  });
  await delay(5000);
  console.log(`  ${tag} 주문 페이지 도달`);

  // 새로입력 탭 전환
  await page.evaluate(() => {
    const tabs = document.querySelectorAll(".ec-base-tab a, .ec-base-tab li a, [class*='ship'] a");
    for (const tab of tabs) {
      if (tab.textContent?.includes("새로입력") || tab.textContent?.includes("직접입력")) {
        (tab as HTMLElement).click();
        return;
      }
    }
    const newArea = document.querySelector(".newShipArea") as HTMLElement;
    const recentArea = document.querySelector(".recentShipArea") as HTMLElement;
    if (newArea) newArea.style.display = "block";
    if (recentArea) recentArea.style.display = "none";
  });
  await delay(1500);

  // 수취자 성명 + 휴대전화 입력 (직접입력 탭에서 필수)
  const rnameField = await page.$("#rname");
  if (rnameField && await rnameField.isVisible()) {
    await rnameField.fill(accName);
    await delay(200);
  }
  const rphoneField = await page.$("#rphone2_");
  if (rphoneField && await rphoneField.isVisible()) {
    await rphoneField.fill(getOrderPhoneDigits());
    await delay(200);
  }

  // 주소검색
  await page.evaluate(() => {
    const btn = document.querySelector("#btn_search_rzipcode") as HTMLElement;
    if (btn) { btn.scrollIntoView({ behavior: "instant", block: "center" }); btn.click(); }
  });
  await delay(500);

  let kakaoFrame = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(500);
    kakaoFrame = page.frames().find((f) => f.url().includes("postcode.map.kakao.com"));
    if (kakaoFrame) break;
  }
  if (!kakaoFrame) throw new Error("카카오 프레임 못 찾음");

  const searchInput = await kakaoFrame.waitForSelector("input#region_name", { timeout: 10000 });
  await searchInput.click({ force: true });
  await searchInput.fill(addr.search);
  await delay(500);
  await searchInput.press("Enter");
  await delay(7000);

  const addrResult = await kakaoFrame.$("span.txt_address button.link_post") ?? await kakaoFrame.$(".link_post");
  if (!addrResult) throw new Error("주소 검색 결과 없음");
  await addrResult.click();
  await delay(3000);

  // 상세주소
  await page.fill("#raddr2", addr.detail);
  await delay(300);
  console.log(`  ${tag} 주소: ${addr.search} ${addr.detail}`);

  // 은행
  const bankOptions = await page.$$eval("#bankaccount option", (opts) =>
    opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
  );
  const bankOpt = bankOptions.find((o) => o.value !== "-1" && o.text.includes("기업은행"))
    ?? bankOptions.find((o) => o.value !== "-1");
  if (!bankOpt) throw new Error("은행 옵션 없음");
  await page.selectOption("#bankaccount", bankOpt.value);

  // 입금자명
  await page.fill("#pname", accName);
  await delay(200);

  // 결제 (중복 클릭 방지: 버튼 비활성화 후 클릭)
  await page.evaluate(() => {
    const btn = document.querySelector("#btn_payment") as HTMLElement;
    if (!btn) return;
    btn.setAttribute("data-clicked", "true");
    btn.click();
    btn.style.pointerEvents = "none";
    btn.setAttribute("disabled", "true");
  });
  await delay(8000);

  if (page.url().includes("orderform")) throw new Error("결제 실패");
  console.log(`  ${tag} 구매 완료!`);
  return true;
};

// === 메인 ===
const run = async () => {
  const arg = process.argv[2];
  const count = arg && /^\d+$/.test(arg) ? parseInt(arg) : 1;
  const existingId = arg && !/^\d+$/.test(arg) ? arg : null;

  const browser = await chromium.launch({ headless: false });

  if (existingId) {
    // 기존 계정 구매
    const accounts = loadAccounts();
    const acc = accounts.find((a) => a.id === existingId) as Record<string, string> | undefined;
    if (!acc) { console.log(`계정 ${existingId} 못 찾음`); await browser.close(); return; }

    // 시트에서 배송지 읽기
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:D1000`,
    });
    const rows = sheetData.data.values ?? [];
    const row = rows.find((r) => r[1] === existingId);
    if (!row) { console.log(`시트에서 ${existingId} 못 찾음`); await browser.close(); return; }

    const fullAddr = row[2] || "";
    // ADDRESS_POOL에서 매칭 (정확한 search/detail 사용)
    const knownAddr = ADDRESS_POOL.find((a) => a.full === fullAddr);
    const search = knownAddr?.search ?? fullAddr.split(" ").slice(2, -2).join(" ");
    const detail = knownAddr?.detail ?? fullAddr.split(" ").slice(-2).join(" ");

    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "ko-KR" });
    const page = await context.newPage();
    page.on("dialog", async (d) => {
      if (d.message().includes("장바구니")) await d.dismiss();
      else await d.accept();
    });

    try {
      await purchaseAccount(page, existingId, acc.password || PASSWORD, acc.name, { search, detail }, "[1/1]");
      // 시트 구매일시 업데이트
      const rowIndex = rows.findIndex((r) => r[1] === existingId);
      if (rowIndex >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_NAME}!D${rowIndex + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [[now()]] },
        });
      }
    } catch (err) {
      console.log(`  에러: ${err instanceof Error ? err.message : err}`);
    } finally {
      await page.close();
      await context.close();
    }
  } else {
    // 시트에서 기존 사용 주소/이름 조회 → 중복 방지
    const usedAddrs = await getUsedAddresses();
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:A1000`,
    });
    const usedNames = new Set((sheetData.data.values ?? []).map((r) => r[0]?.trim()).filter(Boolean));
    const availableAddrs = ADDRESS_POOL.filter((a) => !usedAddrs.has(a.full));
    console.log(`사용 가능 주소: ${availableAddrs.length}/${ADDRESS_POOL.length}개`);
    if (availableAddrs.length < count) throw new Error(`주소 부족! 필요 ${count}개, 남은 ${availableAddrs.length}개. ADDRESS_POOL 추가 필요`);

    // 신규 계정 생성 + 구매
    for (let i = 0; i < count; i++) {
      let acc = generateAccount(availableAddrs);
      // 이름 중복 방지 (최대 10회 재시도)
      for (let retry = 0; retry < 10 && usedNames.has(acc.name); retry++) {
        acc = generateAccount(availableAddrs);
      }
      usedNames.add(acc.name);
      const tag = `[${i + 1}/${count}]`;

      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "ko-KR" });
      const page = await context.newPage();
      page.on("dialog", async (d) => {
        if (d.message().includes("장바구니")) await d.dismiss();
        else await d.accept();
      });

      try {
        // 1. 가입
        const joinOk = await joinAccount(page, acc, tag);
        if (!joinOk) throw new Error("가입 실패");

        saveNewAccount({
          id: acc.id, password: acc.password, name: acc.name,
          email: acc.email, phone: getOrderPhone(),
          gender: acc.gender, reviewCount: 0, purchaseCount: 0,
          createdAt: new Date().toISOString(),
        });

        // 2. 구매 (가입 직후 이미 로그인 상태)
        await purchaseAccount(page, acc.id, acc.password, acc.name, acc.addr, tag, true);

        // 3. 시트 기록
        await appendToSheet([acc.name, acc.id, acc.addr.full, now()]);

        console.log(`  ${tag} 파이프라인 완료: ${acc.name} (${acc.id})`);
      } catch (err) {
        console.log(`  ${tag} 에러: ${err instanceof Error ? err.message : err}`);
      } finally {
        await page.close();
        await context.close();
      }

      if (i < count - 1) {
        const gap = randomInt(5, 15);
        console.log(`  대기 ${gap}초...`);
        await delay(gap * 1000);
      }
    }
  }

  await browser.close();
  console.log("\n완료!");
};

run().catch(console.error);
