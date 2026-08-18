import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";
const ACCOUNTS_FILE = path.resolve(process.cwd(), "accounts/completed-accounts.json");
const OUTPUT_FILE = path.resolve(process.cwd(), "accounts/review-account-map.json");

const delayMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ReviewRow {
  displayNo: string;
  urlNo: string;
  title: string;
  author: string;
  articleHref: string;
  pageNo: number;
}

const buildReviewPageUrl = (pageNo: number): string => {
  const url = new URL(PRODUCT_URL);
  if (pageNo > 1) url.searchParams.set("page_4", String(pageNo));
  url.hash = "use_review";
  return url.toString();
};

const extractReviewRows = async (page: import("playwright").Page): Promise<Omit<ReviewRow, "pageNo" | "urlNo">[]> => {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tr"));
    const results: Array<{ displayNo: string; title: string; author: string; articleHref: string }> = [];

    for (const row of rows) {
      const noCell = row.querySelector("td.RW");
      const subjectLink = row.querySelector(
        "td.subject a[href*='board_no=4'], td.left.txtBreak a[href*='board_no=4']",
      ) as HTMLAnchorElement | null;

      if (!noCell || !subjectLink) continue;

      const displayNo = (noCell.textContent || "").trim();
      const rawTitle = (subjectLink.textContent || "").trim();
      const title = rawTitle.replace(/\s*(NEW|HIT|\[\d+\])\s*/g, "").trim();
      const articleHref = subjectLink.getAttribute("href") || "";

      const authorCell = row.querySelector("td.name");
      const author = (authorCell?.textContent || "").trim();

      if (displayNo && title && articleHref) {
        results.push({ displayNo, title, author, articleHref });
      }
    }

    return results;
  });
};

const run = async () => {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
  const withReviews = accounts.filter((a: any) => a.reviewCount > 0 && a.review);

  const titleToAccount = new Map<string, any>();
  for (const acc of withReviews) {
    const title = (acc.review?.title || "").trim();
    if (title) titleToAccount.set(title, acc);
  }

  console.log(`총 계정: ${accounts.length}개, 리뷰 있는 계정: ${withReviews.length}개`);
  console.log(`고유 제목: ${titleToAccount.size}개\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const seenUrlNos = new Set<string>();
  const mapping: Record<
    string,
    {
      accountId: string;
      accountName: string;
      reviewNo: string;
      displayNo: string;
      reviewTitle: string;
      articleHref: string;
      pageNo: number;
    }
  > = {};

  let matched = 0;
  const maxPages = 80;

  console.log("=== 상품 페이지 리뷰 스캔 ===");
  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    const url = buildReviewPageUrl(pageNo);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await delayMs(1800);

    const rawRows = await extractReviewRows(page);
    const rows: ReviewRow[] = rawRows.map((r) => {
      const noMatch = r.articleHref.match(/[?&]no=(\d+)/);
      const urlNo = noMatch?.[1] || r.displayNo;
      return { ...r, urlNo, pageNo };
    });

    const newRows = rows.filter((r) => !seenUrlNos.has(r.urlNo));
    newRows.forEach((r) => seenUrlNos.add(r.urlNo));

    if (newRows.length === 0) {
      console.log(`  페이지 ${pageNo}: 새 리뷰 없음, 스캔 종료`);
      break;
    }

    let pageMatched = 0;
    for (const review of newRows) {
      const acc = titleToAccount.get(review.title);
      if (acc && !mapping[acc.id]) {
        mapping[acc.id] = {
          accountId: acc.id,
          accountName: acc.name,
          reviewNo: review.urlNo,
          displayNo: review.displayNo,
          reviewTitle: review.title,
          articleHref: review.articleHref,
          pageNo: review.pageNo,
        };
        matched++;
        pageMatched++;
      }
    }

    console.log(
      `  페이지 ${pageNo}: ${newRows.length}개 리뷰, ${pageMatched}개 매칭 (누적 ${matched}/${withReviews.length})`,
    );

    if (matched >= withReviews.length) {
      console.log("  전체 매칭 완료!");
      break;
    }
  }

  await browser.close();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));

  const unmatchedAccounts = withReviews.filter((a: any) => !mapping[a.id]);

  console.log(`\n=== 매칭 결과 ===`);
  console.log(`매칭 성공: ${matched}/${withReviews.length}`);
  console.log(`미매칭: ${unmatchedAccounts.length}개`);
  console.log(`저장: ${OUTPUT_FILE}`);

  if (unmatchedAccounts.length > 0 && unmatchedAccounts.length <= 10) {
    console.log(`\n미매칭 계정:`);
    unmatchedAccounts.forEach((a: any) => console.log(`  ${a.name} (${a.id}) — "${a.review?.title}"`));
  }

  const sample = Object.values(mapping).slice(0, 5);
  console.log(`\n샘플 (처음 5개):`);
  sample.forEach((m: any) =>
    console.log(`  ${m.accountName} (${m.accountId}) → no=${m.reviewNo} [${m.displayNo}] p${m.pageNo} | ${m.reviewTitle}`),
  );
};

run().catch(console.error);
