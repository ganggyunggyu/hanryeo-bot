import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TARGET_URL =
  "https://chundamon.com/product/%ED%95%A0%EC%9D%B8%ED%8A%B9%EA%B0%80%EB%AA%A8%EC%9D%8C%EC%A0%84-%EC%B2%9C%EB%8B%B4%EC%98%A8-%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84-%ED%9D%91%EC%97%BC%EC%86%8C%EC%A7%84%EC%95%A1/12/category/42/display/1/?page_6=1#use_qna";
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "scripts/chundamon-reviews.json"
);

interface Review {
  title: string;
  content: string;
  author: string;
  date: string;
  rating?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const crawlReviews = async () => {
  console.log("=== 천담온 사용후기 크롤링 시작 ===\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    console.log("페이지 로딩 중...");
    await page.goto(TARGET_URL, { waitUntil: "load", timeout: 60000 });
    await delay(5000);

    console.log("현재 URL:", page.url());
    console.log("페이지 제목:", await page.title());

    // URL에 해시가 있으면 자동 스크롤됨
    console.log("\n페이지 안정화 대기 중...");
    await delay(3000);

    // 페이지에서 사용후기 관련 요소 찾기
    console.log("\n페이지 구조 분석 중...");
    const pageInfo = await page.evaluate(() => {
      // 섹션 ID 찾기
      const sections = Array.from(document.querySelectorAll("[id]"))
        .map((el) => el.id)
        .filter(
          (id) =>
            id.includes("qna") ||
            id.includes("review") ||
            id.includes("use") ||
            id.includes("board")
        );

      // "사용후기", "Q&A", "리뷰" 텍스트 포함하는 요소 찾기
      const allElements = Array.from(document.querySelectorAll("*"));
      const reviewElements = allElements
        .filter((el) => {
          const text = el.textContent?.trim() || "";
          return (
            text.includes("사용후기") ||
            text.includes("Q&A") ||
            text.includes("리뷰") ||
            text.includes("구매후기")
          );
        })
        .slice(0, 10)
        .map((el) => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          text: el.textContent?.trim().substring(0, 100),
        }));

      return { sections, reviewElements };
    });

    console.log("발견된 섹션 IDs:", pageInfo.sections);
    console.log(
      "리뷰 관련 요소:",
      JSON.stringify(pageInfo.reviewElements, null, 2)
    );

    // 리뷰 리스트 추출 시도
    console.log("\n리뷰 리스트 추출 중...");

    const allReviews: Review[] = [];
    let currentPage = 1;
    const maxPages = 50;

    while (currentPage <= maxPages) {
      console.log(`\n[페이지 ${currentPage}] 크롤링 중...`);

      // 다양한 셀렉터 패턴으로 리뷰 찾기
      const reviews = await page.evaluate(() => {
        const selectors = [
          "div.review-item",
          "li.review",
          "tr.review",
          "div[class*='review']",
          "div[class*='qna']",
          "div[class*='board']",
          "table tbody tr",
          ".xans-board-list tbody tr",
        ];

        let items: Element[] = [];
        for (const selector of selectors) {
          items = Array.from(document.querySelectorAll(selector));
          if (items.length > 0) {
            console.log(`셀렉터 "${selector}"로 ${items.length}개 발견`);
            break;
          }
        }

        return items.slice(0, 20).map((item) => {
          const text = item.textContent?.trim() || "";

          // 제목 찾기
          const titleEl =
            item.querySelector("a, .title, .subject, td:nth-child(2)") ||
            item.querySelector("strong") ||
            item;
          const title = titleEl?.textContent?.trim() || "";

          // 작성자 찾기
          const authorEl = item.querySelector(
            ".author, .writer, .name, td:nth-child(3)"
          );
          const author = authorEl?.textContent?.trim() || "";

          // 날짜 찾기
          const dateEl = item.querySelector(".date, .time, td:nth-child(4)");
          const date =
            dateEl?.textContent?.trim() ||
            text.match(/\d{4}[-./]\d{2}[-./]\d{2}/)?.[0] ||
            "";

          // 평점 찾기
          const ratingEl = item.querySelector(
            "[class*='star'], [class*='rating']"
          );
          const rating = ratingEl?.textContent?.trim() || "";

          return {
            title: title.substring(0, 200),
            content: text.substring(0, 500),
            author,
            date,
            rating,
          };
        });
      });

      console.log(`  → ${reviews.length}개 리뷰 수집`);

      if (reviews.length === 0) {
        console.log("리뷰를 더 이상 찾을 수 없습니다.");
        break;
      }

      allReviews.push(...reviews);
      console.log(`  현재 총 ${allReviews.length}개 수집됨`);

      // 다음 페이지 버튼 찾기
      const nextPageButton = await page.$(
        'a[class*="next"], button[class*="next"], a:has-text("다음"), a:has-text(">")'
      );

      if (!nextPageButton) {
        console.log("다음 페이지 버튼 없음. 크롤링 종료.");
        break;
      }

      const isDisabled = await nextPageButton.evaluate(
        (el) =>
          el.hasAttribute("disabled") ||
          el.classList.contains("disabled") ||
          el.classList.contains("this")
      );

      if (isDisabled) {
        console.log("마지막 페이지 도달. 크롤링 종료.");
        break;
      }

      console.log("  다음 페이지로 이동 중...");
      // 강제 클릭 (오버레이 무시)
      await nextPageButton.click({ force: true }).catch(async () => {
        // 클릭 실패 시 JavaScript로 직접 클릭
        await nextPageButton.evaluate((el) => (el as HTMLElement).click());
      });
      await delay(3000);

      currentPage++;
    }

    console.log(`\n=== 크롤링 완료 ===`);
    console.log(`총 수집: ${allReviews.length}개`);

    // 파일 저장
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(
        {
          crawledAt: new Date().toISOString(),
          totalCount: allReviews.length,
          reviews: allReviews,
        },
        null,
        2
      ),
      "utf-8"
    );

    console.log(`\n파일 저장 완료: ${OUTPUT_FILE}`);

    // 샘플 출력
    console.log("\n=== 리뷰 샘플 (처음 10개) ===");
    allReviews.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   작성자: ${r.author} | 날짜: ${r.date}`);
      if (r.rating) console.log(`   평점: ${r.rating}`);
    });
  } catch (err) {
    console.error("크롤링 오류:", err);
  } finally {
    await browser.close();
  }
};

crawlReviews().catch(console.error);
