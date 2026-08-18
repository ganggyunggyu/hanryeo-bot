import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { loginAction } from "../src/features/auth/lib/login-action";
import { createLog } from "../src/types/automation";

const BASE_URL = "https://hanryeodamwon.com";
const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const OUTPUT_FILE = path.resolve(process.cwd(), "accounts/review-account-map.json");

const RECENT_COUNT = 30;
const BOARD_NO = "4";

const delayMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

const onLog = (log: ReturnType<typeof createLog>) => {
  console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
};

const buildProductReviewPageUrl = (pageNo: number): string => {
  const url = new URL(PRODUCT_URL);
  if (pageNo > 1) url.searchParams.set("page_4", String(pageNo));
  url.hash = "use_review";
  return url.toString();
};

const collectReviewNosFromProductPage = async (page: import("playwright").Page): Promise<string[]> => {
  const allNos: string[] = [];
  const maxPages = 8;

  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    const url = buildProductReviewPageUrl(pageNo);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await delayMs(2500);

    const nums = await page.evaluate(() => {
      const results: string[] = [];
      const rows = document.querySelectorAll(".boardList table tbody tr, .xans-board-listnormal table tbody tr, #prdReview table tbody tr");

      if (rows.length > 0) {
        rows.forEach((row) => {
          const noCell = row.querySelector("td:first-child, td.RW, td.no");
          const text = (noCell?.textContent || "").trim();
          if (/^\d+$/.test(text) && parseInt(text) > 0) {
            results.push(text);
          }
        });
      }

      if (results.length === 0) {
        const allTrs = document.querySelectorAll("table tr");
        allTrs.forEach((tr) => {
          const cells = tr.querySelectorAll("td");
          cells.forEach((td) => {
            const cls = td.className.toLowerCase();
            if (cls.includes("rw") || cls.includes("no")) {
              const text = (td.textContent || "").trim();
              if (/^\d+$/.test(text) && parseInt(text) > 100) {
                results.push(text);
              }
            }
          });
        });
      }

      if (results.length === 0) {
        const allTrs = document.querySelectorAll("table tr");
        allTrs.forEach((tr) => {
          const tds = tr.querySelectorAll("td");
          if (tds.length >= 3) {
            const firstText = (tds[0]?.textContent || "").trim();
            if (/^\d{3,}$/.test(firstText)) {
              results.push(firstText);
            }
          }
        });
      }

      return results;
    });

    const debugInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      const info: any[] = [];
      tables.forEach((table, idx) => {
        const rows = table.querySelectorAll("tr");
        if (rows.length > 0) {
          const firstRow = rows[0];
          const cells = firstRow.querySelectorAll("td, th");
          info.push({
            tableIdx: idx,
            rowCount: rows.length,
            firstRowCells: Array.from(cells).slice(0, 5).map((c) => ({
              text: (c.textContent || "").trim().substring(0, 30),
              cls: c.className,
            })),
          });
        }
      });

      const editLinks = document.querySelectorAll("a[href*='modify'][href*='board_no=4']");
      const editHrefs = Array.from(editLinks).slice(0, 10).map((a) => (a as HTMLAnchorElement).href);

      return { tableCount: tables.length, tables: info, editHrefs };
    });

    if (nums.length > 0) {
      allNos.push(...nums);
      console.log(`  페이지 ${pageNo}: ${nums.length}개 (${nums.join(", ")})`);
    } else {
      console.log(`  페이지 ${pageNo}: 리뷰 번호 없음`);
      console.log(`    테이블 수: ${debugInfo.tableCount}`);
      debugInfo.tables.forEach((t: any) => {
        console.log(`    table[${t.tableIdx}] rows=${t.rowCount}, cells=`, JSON.stringify(t.firstRowCells));
      });
      if (debugInfo.editHrefs.length > 0) {
        console.log(`    수정 링크: ${debugInfo.editHrefs.join("\n      ")}`);
        const extractedNos = debugInfo.editHrefs
          .map((href: string) => {
            const match = href.match(/[?&]no=(\d+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];
        if (extractedNos.length > 0) {
          allNos.push(...extractedNos);
          console.log(`    수정링크에서 추출한 번호: ${extractedNos.join(", ")}`);
        }
      }
    }

    if (allNos.length >= RECENT_COUNT) break;
    if (nums.length === 0 && debugInfo.editHrefs.length === 0) break;
  }

  return [...new Set(allNos)].slice(0, RECENT_COUNT + 10);
};

const run = async () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const withReviews = accounts.filter((a: any) => a.reviewCount > 0 && a.review);
  const recentAccounts = withReviews.slice(-RECENT_COUNT).reverse();

  console.log(`총 계정: ${accounts.length}개`);
  console.log(`리뷰 있는 계정: ${withReviews.length}개`);
  console.log(`최근 ${RECENT_COUNT}개 대상: ${recentAccounts.length}개 (끝에서부터)\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("=== 상품 페이지 리뷰 번호 수집 ===");
  const reviewNos = await collectReviewNosFromProductPage(page);
  console.log(`\n수집된 리뷰 번호: ${reviewNos.length}개 (${reviewNos.join(", ")})\n`);

  if (reviewNos.length === 0) {
    console.log("리뷰 번호를 찾지 못함.");
    await browser.close();
    return;
  }

  const mapping: Record<string, { accountId: string; name: string; reviewNo: string; editUrl: string }> = {};

  if (fs.existsSync(OUTPUT_FILE)) {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    Object.assign(mapping, existing);
    console.log(`기존 매핑 로드: ${Object.keys(existing).length}개\n`);
  }

  const matchedReviewNos = new Set(Object.values(mapping).map((m: any) => m.reviewNo));

  console.log("=== 계정별 리뷰 매칭 ===");
  for (let i = 0; i < recentAccounts.length; i++) {
    const acc = recentAccounts[i];
    const tag = `[${i + 1}/${recentAccounts.length}]`;

    if (mapping[acc.id]) {
      console.log(`${tag} ${acc.name} (${acc.id}) — 이미 매칭: no=${mapping[acc.id].reviewNo}`);
      continue;
    }

    console.log(`${tag} ${acc.name} (${acc.id}) — 로그인...`);
    const loginResult = await loginAction(page, { baseUrl: BASE_URL, id: acc.id, password: acc.password }, onLog);
    if (!loginResult.success) {
      console.log(`${tag} 로그인 실패, 스킵`);
      continue;
    }

    let matched = false;
    const remainingNos = reviewNos.filter((no) => !matchedReviewNos.has(no));

    for (const no of remainingNos) {
      const editUrl = `${BASE_URL}/board/product/modify.html?board_act=edit&no=${no}&board_no=${BOARD_NO}`;

      let gotAlert = false;
      const dialogHandler = async (dialog: import("playwright").Dialog) => {
        gotAlert = true;
        await dialog.accept();
      };
      page.on("dialog", dialogHandler);

      try {
        await page.goto(editUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
        await delayMs(1500);
      } catch {
        page.removeListener("dialog", dialogHandler);
        continue;
      }
      page.removeListener("dialog", dialogHandler);

      if (gotAlert) continue;

      const hasSubject = await page.$("#subject").then(Boolean).catch(() => false);
      if (hasSubject) {
        mapping[acc.id] = { accountId: acc.id, name: acc.name, reviewNo: no, editUrl };
        matchedReviewNos.add(no);
        console.log(`${tag} 매칭! reviewNo=${no}`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
        matched = true;
        break;
      }
    }

    if (!matched) {
      console.log(`${tag} 매칭 실패`);
    }
  }

  await browser.close();

  const matchedCount = Object.keys(mapping).length;
  console.log(`\n========================================`);
  console.log(`  매칭 완료: ${matchedCount}/${recentAccounts.length}`);
  console.log(`========================================`);
  Object.values(mapping).forEach((m: any) => {
    console.log(`  ${m.name} (${m.accountId}) → no=${m.reviewNo}`);
  });
  console.log(`\n저장: ${OUTPUT_FILE}`);
};

run().catch(console.error);
