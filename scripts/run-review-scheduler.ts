import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "../src/features/auth/lib/login-action";
import { visitProductAction } from "../src/features/product/lib/visit-product-action";
import { writeReviewAction } from "../src/features/review/lib/write-review-action";
import { createLog } from "../src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/#review";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const LOG_FILE = path.resolve(process.cwd(), "logs/review-scheduler.log");

const onLog = (log: ReturnType<typeof createLog>) => {
  const logMessage = `[${new Date().toISOString()}] [${log.level.toUpperCase()}] ${log.message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n", "utf-8");
};

const writeReview = async (account: any) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    onLog({ level: "info", message: `[${account.name}] 리뷰 수정 시작` });

    // 로그인
    const loginResult = await loginAction(
      page,
      { baseUrl: BASE_URL, id: account.id, password: account.password },
      onLog,
    );
    if (!loginResult.success) throw new Error(`로그인 실패: ${loginResult.error}`);

    // 제품 페이지 이동
    const visitResult = await visitProductAction(page, { productUrl: PRODUCT_URL }, onLog);
    if (!visitResult.success) throw new Error(`제품 페이지 이동 실패: ${visitResult.error}`);

    // 리뷰 수정
    const reviewResult = await writeReviewAction(
      page,
      { accountId: account.id, title: account.review.title, content: account.review.content },
      onLog,
    );

    if (reviewResult.success) {
      onLog({
        level: "info",
        message: `[${account.name}] 리뷰 수정 완료 - ${account.review.title}`,
      });
      return { success: true };
    }

    throw new Error(reviewResult.error || "리뷰 수정 실패");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onLog({ level: "error", message: `[${account.name}] 실패: ${msg}` });
    return { success: false, error: msg };
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
};

const generateSchedule = (count: number, endHour: number) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // 현재부터 종료 시간까지의 총 분
  const totalMinutes =
    endHour > currentHour
      ? (endHour - currentHour) * 60 - currentMinute
      : (24 - currentHour + endHour) * 60 - currentMinute;

  if (totalMinutes <= 0) {
    throw new Error("종료 시간이 이미 지났습니다.");
  }

  // 시간대별 가중치 (자연스러운 분포)
  const getWeight = (hour: number) => {
    if (hour >= 9 && hour < 12) return 1.5; // 오전 시간대
    if (hour >= 12 && hour < 14) return 1.2; // 점심 시간대
    if (hour >= 14 && hour < 18) return 1.5; // 오후 시간대
    if (hour >= 18 && hour < 22) return 2.0; // 저녁 시간대 (가장 많음)
    if (hour >= 22 && hour < 24) return 0.8; // 늦은 저녁
    if (hour >= 0 && hour < 6) return 0.2; // 새벽 (거의 없음)
    if (hour >= 6 && hour < 9) return 0.7; // 아침
    return 1.0;
  };

  const schedules: Date[] = [];
  const baseInterval = Math.floor(totalMinutes / count);

  for (let i = 0; i < count; i++) {
    // 기본 간격 + 랜덤 변동 (-30% ~ +30%)
    const randomFactor = 0.7 + Math.random() * 0.6;
    let minutes = Math.floor(baseInterval * i * randomFactor);

    // 시간대별 가중치 적용
    const targetTime = new Date(now.getTime() + minutes * 60000);
    const targetHour = targetTime.getHours();
    const weight = getWeight(targetHour);

    // 가중치가 낮은 시간대는 건너뛰기 (확률적으로)
    if (Math.random() > weight) {
      minutes += Math.floor(baseInterval * 0.3);
    }

    const scheduledTime = new Date(now.getTime() + minutes * 60000);
    schedules.push(scheduledTime);
  }

  // 시간순 정렬
  return schedules.sort((a, b) => a.getTime() - b.getTime());
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  // 로그 디렉토리 생성
  const logsDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // 로그 파일 초기화
  fs.writeFileSync(LOG_FILE, "", "utf-8");

  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const targets = accounts.filter((a: any) => a.reviewCount > 0 && a.review);

  if (targets.length === 0) {
    onLog({ level: "info", message: "리뷰 수정할 계정이 없습니다." });
    return;
  }

  const reviewCount = Math.min(20, targets.length);
  const selectedAccounts = targets.slice(0, reviewCount);

  onLog({ level: "info", message: `=== 리뷰 스케줄러 시작 ===` });
  onLog({ level: "info", message: `대상 계정 수: ${reviewCount}개` });
  onLog({ level: "info", message: `종료 시간: 오늘 밤 24시 (자정)` });

  const schedules = generateSchedule(reviewCount, 24);

  onLog({ level: "info", message: `\n=== 스케줄 ===` });
  schedules.forEach((time, i) => {
    onLog({
      level: "info",
      message: `${i + 1}. ${time.toLocaleString("ko-KR")} - ${selectedAccounts[i].name} (${selectedAccounts[i].id})`,
    });
  });

  onLog({ level: "info", message: `\n=== 실행 시작 ===` });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < reviewCount; i++) {
    const scheduledTime = schedules[i];
    const account = selectedAccounts[i];
    const now = new Date();

    if (scheduledTime > now) {
      const waitMs = scheduledTime.getTime() - now.getTime();
      const waitMin = Math.floor(waitMs / 60000);
      onLog({
        level: "info",
        message: `다음 실행까지 ${waitMin}분 대기 중... (${scheduledTime.toLocaleTimeString("ko-KR")})`,
      });
      await sleep(waitMs);
    }

    onLog({
      level: "info",
      message: `\n[${i + 1}/${reviewCount}] ${account.name} (${account.id}) 리뷰 수정 중...`,
    });
    onLog({ level: "info", message: `타입: ${account.review.type}` });
    onLog({ level: "info", message: `제목: ${account.review.title}` });

    const result = await writeReview(account);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // 작업 간 랜덤 딜레이 (1~3분)
    if (i < reviewCount - 1) {
      const delayMs = (60 + Math.random() * 120) * 1000;
      await sleep(delayMs);
    }
  }

  onLog({ level: "info", message: `\n=== 스케줄러 완료 ===` });
  onLog({ level: "info", message: `성공: ${successCount}개` });
  onLog({ level: "info", message: `실패: ${failCount}개` });
  onLog({ level: "info", message: `로그 파일: ${LOG_FILE}` });
};

run().catch((err) => {
  onLog({ level: "error", message: `스케줄러 오류: ${err.message}` });
  console.error(err);
});
