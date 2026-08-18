import { chromium, type Page } from "playwright";
import { loginAction } from "../src/features/auth/lib/login-action";
import { upsertReviewRef, getAccounts } from "../src/features/join/lib/account-storage";

interface ReviewItem {
  reviewNo: string;
  title: string;
  articleUrl: string;
  editUrl: string;
}

const BASE_URL = "https://hanryeodamwon.com";
const REVIEW_BOARD_BASE_URL = `${BASE_URL}/board/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%EB%A6%AC%EB%B7%B0/4/`;
const TARGET_NAME_PREFIX = process.env.TARGET_NAME_PREFIX ?? "윤";
const REVIEW_LIMIT = Number(process.env.REVIEW_LIMIT ?? 30);
const PAGE_LIMIT = Number(process.env.REVIEW_PAGE_LIMIT ?? 12);
const HEADLESS = process.env.HEADLESS !== "false";

const parseReviewNo = (href: string): string | null => {
  const pathMatch = href.match(/\/article\/[^/]+\/4\/(\d+)\//);
  if (pathMatch?.[1]) return pathMatch[1];

  try {
    const parsed = new URL(href);
    return parsed.searchParams.get("no");
  } catch {
    return null;
  }
};

const collectReviewsOnPage = async (page: Page): Promise<ReviewItem[]> => {
  const links = await page.$$eval("a[href]", (elements) =>
    elements
      .map((element) => {
        const anchor = element as HTMLAnchorElement;
        return {
          href: anchor.href || "",
          title: (anchor.textContent || "").trim(),
        };
      })
      .filter((item) => item.href.includes("/article/") && item.href.includes("/4/"))
  );

  const unique = new Map<string, ReviewItem>();
  for (const link of links) {
    const reviewNo = parseReviewNo(link.href);
    if (!reviewNo) continue;
    if (unique.has(reviewNo)) continue;

    unique.set(reviewNo, {
      reviewNo,
      title: link.title,
      articleUrl: link.href,
      editUrl: `${BASE_URL}/board/product/modify.html?board_act=edit&no=${reviewNo}&board_no=4`,
    });
  }

  return Array.from(unique.values());
};

const fetchRecentReviews = async (page: Page): Promise<ReviewItem[]> => {
  const reviews: ReviewItem[] = [];
  const seen = new Set<string>();

  for (let pageNo = 1; pageNo <= PAGE_LIMIT; pageNo += 1) {
    const url = pageNo === 1 ? REVIEW_BOARD_BASE_URL : `${REVIEW_BOARD_BASE_URL}?page=${pageNo}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const items = await collectReviewsOnPage(page);
    if (items.length === 0) break;

    for (const item of items) {
      if (seen.has(item.reviewNo)) continue;
      seen.add(item.reviewNo);
      reviews.push(item);
      if (reviews.length >= REVIEW_LIMIT) return reviews;
    }
  }

  return reviews;
};

const tryMatchAccountReviews = async (
  page: Page,
  accountId: string,
  reviews: ReviewItem[],
  claimedReviewNos: Set<string>,
): Promise<ReviewItem[]> => {
  const matched: ReviewItem[] = [];

  for (const review of reviews) {
    if (claimedReviewNos.has(review.reviewNo)) continue;

    await page.goto(review.editUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);

    const canEdit = Boolean(await page.$("#subject"));
    if (!canEdit) continue;

    upsertReviewRef(accountId, {
      reviewNo: review.reviewNo,
      boardNo: "4",
      reviewTitle: review.title,
      editUrl: review.editUrl,
    });
    claimedReviewNos.add(review.reviewNo);
    matched.push(review);
  }

  return matched;
};

const run = async (): Promise<void> => {
  const allAccounts = getAccounts();
  const targetAccounts = allAccounts.filter((account) =>
    String(account.name ?? "").startsWith(TARGET_NAME_PREFIX),
  );

  if (targetAccounts.length === 0) {
    console.log(`대상 계정이 없음: prefix=${TARGET_NAME_PREFIX}`);
    return;
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const probeContext = await browser.newContext({ locale: "ko-KR" });
  const probePage = await probeContext.newPage();
  const recentReviews = await fetchRecentReviews(probePage);
  await probePage.close();
  await probeContext.close();

  if (recentReviews.length === 0) {
    console.log("최근 리뷰 목록을 수집하지 못함");
    await browser.close();
    return;
  }

  console.log(`대상 계정: ${targetAccounts.length}개`);
  console.log(`최근 리뷰: ${recentReviews.length}개`);
  console.log("매칭 시작...");

  const claimedReviewNos = new Set<string>();
  let totalMatched = 0;

  for (let i = 0; i < targetAccounts.length; i += 1) {
    const account = targetAccounts[i];
    const tag = `[${i + 1}/${targetAccounts.length}]`;
    const context = await browser.newContext({ locale: "ko-KR" });
    const page = await context.newPage();

    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    try {
      console.log(`${tag} 로그인 시도: ${account.id} (${account.name})`);
      const loginResult = await loginAction(
        page,
        { baseUrl: BASE_URL, id: account.id, password: account.password },
        (log) => {
          if (log.level === "error") {
            console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
          }
        },
      );

      if (!loginResult.success) {
        console.log(`${tag} 로그인 실패`);
        await page.close();
        await context.close();
        continue;
      }

      const matched = await tryMatchAccountReviews(page, account.id, recentReviews, claimedReviewNos);
      if (matched.length === 0) {
        console.log(`${tag} 매칭 없음`);
      } else {
        totalMatched += matched.length;
        const reviewNos = matched.map((item) => item.reviewNo).join(", ");
        console.log(`${tag} 매칭 성공 ${matched.length}건: no=${reviewNos}`);
      }
    } finally {
      await page.close();
      await context.close();
    }
  }

  await browser.close();
  console.log(`완료: 총 매칭 ${totalMatched}건`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
