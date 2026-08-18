import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "./src/features/auth/lib/login-action";
import { visitProductAction } from "./src/features/product/lib/visit-product-action";
import { writeReviewAction } from "./src/features/review/lib/write-review-action";
import { createLog } from "./src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/#review";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const IMAGE_DIR = path.resolve(process.cwd(), "한려담원_리뷰사진");

const RECENT_COUNT = 30;
const USED_IMAGE_SETS = new Set([1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16]);
const DONE_ACCOUNT_IDS = new Set([
  "ddh86", "rma8989", "qhrfks890", "wowowq22", "sssfio45", "wjddla00",
  "ekfkawnl00", "rudgml99", "xcvdfg33", "awaw456", "dlckdtjq776",
  "wjdwlstn773", "qkrrudtn880", "dltjdgh992", "rladudtn775",
]);

const ORDERED_SETS = [4, 11];

const shuffle = <T>(items: T[]): T[] => {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};

const pickImagePaths = (setNumber: number, count: number): string[] => {
  const paths = [`${setNumber}-1.webp`];
  if (count >= 2) paths.push(`${setNumber}-2.webp`);
  if (count >= 3) paths.push(`${setNumber}-3.webp`);
  return paths.map((p) => path.resolve(IMAGE_DIR, p));
};

const distributeImageCounts = (total: number): number[] => {
  const distribution = [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3];
  const shuffled = shuffle(distribution);
  return shuffled.slice(0, total);
};

const run = async () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const withReviews = accounts.filter((a: any) => a.reviewCount > 0 && a.review);

  const recentAccounts = withReviews
    .slice(-RECENT_COUNT)
    .reverse()
    .filter((a: any) => !DONE_ACCOUNT_IDS.has(a.id));
  console.log(`총 계정: ${accounts.length}개`);
  console.log(`리뷰 있는 계정: ${withReviews.length}개`);
  console.log(`최근 ${RECENT_COUNT}개 대상: ${recentAccounts.length}개 (끝에서부터)`);

  const targetCount = Math.min(ORDERED_SETS.length, recentAccounts.length);
  const indices = Array.from({ length: recentAccounts.length }, (_, i) => i);
  const pickedIndices = shuffle(indices).slice(0, targetCount).sort((a, b) => a - b);
  const selectedAccounts = pickedIndices.map((idx) => recentAccounts[idx]);
  const imageCounts = distributeImageCounts(targetCount);

  console.log(`\n랜덤 선택 위치: ${pickedIndices.map((i) => i + 1).join(", ")} (30개 중 ${targetCount}개)`);
  console.log(`사용 이미지 세트 (순서대로): ${ORDERED_SETS.slice(0, targetCount).join(", ")} (${targetCount}개)`);
  console.log(`이미지 개수 분배: ${imageCounts.join(", ")}`);

  const assignments = selectedAccounts.map((acc: any, i: number) => ({
    account: acc,
    imageSet: ORDERED_SETS[i],
    imageCount: imageCounts[i],
    imagePaths: pickImagePaths(ORDERED_SETS[i], imageCounts[i]),
  }));

  console.log("\n========================================");
  console.log("  리뷰 이미지 배치 시작");
  console.log("========================================");
  assignments.forEach((a: any, i: number) => {
    const imageNames = a.imagePaths.map((p: string) => path.basename(p)).join(", ");
    console.log(`  [${i + 1}] ${a.account.name} (${a.account.id}) → 세트${a.imageSet} (${a.imageCount}장: ${imageNames})`);
  });
  console.log("========================================\n");

  const browser = await chromium.launch({ headless: true });
  const results: { id: string; name: string; imageSet: number; success: boolean; error?: string }[] = [];
  const startTime = Date.now();

  for (let i = 0; i < assignments.length; i++) {
    const { account: acc, imageSet, imageCount, imagePaths } = assignments[i];
    const tag = `[${i + 1}/${assignments.length}]`;

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: "ko-KR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    try {
      const imageNames = imagePaths.map((p: string) => path.basename(p)).join(", ");
      console.log(`\n${tag} ===== ${acc.name} (${acc.id}) — 세트${imageSet} (${imageCount}장: ${imageNames}) =====`);

      const missingFiles = imagePaths.filter((p: string) => !fs.existsSync(p));
      if (missingFiles.length > 0) {
        throw new Error(`이미지 파일 없음: ${missingFiles.map((p: string) => path.basename(p)).join(", ")}`);
      }

      const loginResult = await loginAction(page, { baseUrl: BASE_URL, id: acc.id, password: acc.password }, onLog);
      if (!loginResult.success) throw new Error(`로그인 실패: ${loginResult.error}`);

      const visitResult = await visitProductAction(page, { productUrl: PRODUCT_URL }, onLog);
      if (!visitResult.success) throw new Error(`제품 페이지 실패: ${visitResult.error}`);

      const reviewResult = await writeReviewAction(
        page,
        {
          accountId: acc.id,
          accountName: acc.name,
          imageOnly: true,
          explicitImagePaths: imagePaths,
        },
        onLog,
      );

      if (!reviewResult.success) throw new Error(`이미지 추가 실패: ${reviewResult.error}`);

      results.push({ id: acc.id, name: acc.name, imageSet, success: true });
      console.log(`${tag} SUCCESS — 세트${imageSet} (${imageCount}장)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: acc.id, name: acc.name, imageSet, success: false, error: msg });
      console.log(`${tag} FAILED: ${msg}`);
    } finally {
      await page.close();
      await context.close();
    }
  }

  await browser.close();

  const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
  const successCount = results.filter((r) => r.success).length;
  const failedList = results.filter((r) => !r.success);

  console.log("\n\n========================================");
  console.log("       리뷰 이미지 배치 결과");
  console.log("========================================");
  console.log(`성공: ${successCount}/${assignments.length}`);
  console.log(`실패: ${failedList.length}/${assignments.length}`);
  console.log(`소요 시간: 약 ${elapsed}분`);

  if (successCount > 0) {
    console.log("\n--- 성공 목록 ---");
    results
      .filter((r) => r.success)
      .forEach((r) => console.log(`  ${r.id} (${r.name}) — 세트${r.imageSet}`));
  }

  if (failedList.length > 0) {
    console.log("\n--- 실패 목록 ---");
    failedList.forEach((r) => console.log(`  ${r.id} (${r.name}) — 세트${r.imageSet} | ${r.error}`));
  }

  console.log("\n사용된 이미지 세트:", results.filter((r) => r.success).map((r) => r.imageSet).sort((a, b) => a - b).join(", "));
  console.log("완료!");
};

run().catch(console.error);
