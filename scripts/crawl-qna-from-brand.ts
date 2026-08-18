import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BRAND_URL = "https://brand.naver.com/chundamon";
const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "scripts/qna-questions-list.json"
);

interface QnaQuestion {
  status: string;
  title: string;
  author: string;
  date: string;
  isSecret: boolean;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const crawlQnaFromBrand = async () => {
  console.log("=== 천담온 브랜드 페이지에서 Q&A 크롤링 시작 ===\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // 1. 브랜드 페이지 접속
    console.log("1. 브랜드 페이지 접속 중...");
    await page.goto(BRAND_URL, { waitUntil: "networkidle", timeout: 60000 });
    await delay(3000);

    console.log("페이지 제목:", await page.title());

    // 2. 제품 찾기 ("흑염소진액" 또는 "7420646317" 포함)
    console.log("\n2. 제품 찾는 중...");

    // 페이지 스크롤 (lazy loading)
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await delay(2000);

    // 제품 링크 찾기
    const productLink = await page.$(
      'a[href*="7420646317"], a:has-text("흑염소진액"), a:has-text("흑염소")'
    );

    if (!productLink) {
      console.log("⚠️ 제품을 찾을 수 없습니다.");
      console.log("페이지의 모든 링크:");
      const allLinks = await page.$$eval("a", (links) =>
        links
          .map((link) => ({
            text: link.textContent?.trim().substring(0, 50),
            href: link.getAttribute("href"),
          }))
          .filter((link) => link.href?.includes("products"))
          .slice(0, 20)
      );
      console.log(JSON.stringify(allLinks, null, 2));
      return;
    }

    console.log("제품 링크 발견! 클릭 중...");
    await productLink.click();
    await delay(5000);

    console.log("제품 페이지 URL:", page.url());
    console.log("제품 페이지 제목:", await page.title());

    // 3. Q&A 탭 클릭
    console.log("\n3. Q&A 탭 찾는 중...");
    const qnaTab = await page
      .waitForSelector('[data-name="QNA"], a:has-text("Q&A")', {
        timeout: 10000,
      })
      .catch(() => null);

    if (!qnaTab) {
      console.log("⚠️ Q&A 탭을 찾을 수 없습니다.");
      const allTabs = await page.$$eval("[role='menuitem']", (tabs) =>
        tabs.map((tab) => ({
          text: tab.textContent?.trim(),
          dataName: tab.getAttribute("data-name"),
        }))
      );
      console.log("페이지의 모든 탭:", allTabs);
      return;
    }

    console.log("Q&A 탭 클릭 중...");
    await qnaTab.click();
    await delay(5000);

    // 4. Q&A 리스트 로드 대기
    console.log("\n4. Q&A 리스트 로딩 대기 중...");
    await page
      .waitForSelector("li[class*='item'], div[class*='question']", {
        timeout: 10000,
      })
      .catch(() => {
        console.log("⚠️ Q&A 리스트를 찾을 수 없습니다.");
      });
    await delay(2000);

    // 5. Q&A 크롤링 시작
    console.log("\n5. Q&A 크롤링 시작");
    const allQuestions: QnaQuestion[] = [];
    let currentPage = 1;
    const maxPages = 50;

    while (currentPage <= maxPages) {
      console.log(`\n[페이지 ${currentPage}] 크롤링 중...`);

      // 질문 리스트 추출
      const questions = await page.evaluate(() => {
        // 여러 패턴의 셀렉터 시도
        const selectors = [
          "li[class*='item']",
          "div[class*='question']",
          "[class*='qna']",
          "[class*='inquiry']",
        ];

        let items: Element[] = [];
        for (const selector of selectors) {
          items = Array.from(document.querySelectorAll(selector));
          if (items.length > 0) break;
        }

        return items.slice(0, 10).map((item) => {
          const text = item.textContent?.trim() || "";

          return {
            status: text.includes("답변완료")
              ? "답변완료"
              : text.includes("답변대기")
                ? "답변대기"
                : "",
            title: text.substring(0, 200),
            author: "",
            date: text.match(/\d{4}\.\d{2}\.\d{2}/)?.[0] || "",
            isSecret: text.includes("비밀글") || text.includes("🔒"),
          };
        });
      });

      console.log(`  → ${questions.length}개 질문 수집`);

      if (questions.length === 0) {
        console.log("질문을 더 이상 찾을 수 없습니다. 크롤링 종료.");
        break;
      }

      allQuestions.push(...questions);
      console.log(`  현재 총 ${allQuestions.length}개 수집됨`);

      // 다음 페이지 버튼 찾기
      const nextPageButton = await page.$(
        'a[aria-label="다음"], button:has-text("다음"), a:has-text("다음")'
      );

      if (!nextPageButton) {
        console.log("다음 페이지 버튼 없음. 크롤링 종료.");
        break;
      }

      const isDisabled = await nextPageButton.evaluate(
        (el) =>
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true"
      );

      if (isDisabled) {
        console.log("마지막 페이지 도달. 크롤링 종료.");
        break;
      }

      await nextPageButton.click();
      await delay(2000);

      currentPage++;
    }

    // 비밀글 제외
    const publicQuestions = allQuestions.filter((q) => !q.isSecret && q.title);

    console.log(`\n=== 크롤링 완료 ===`);
    console.log(`총 수집: ${allQuestions.length}개`);
    console.log(`비밀글 제외: ${publicQuestions.length}개`);

    // 파일 저장
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(
        {
          crawledAt: new Date().toISOString(),
          totalCount: publicQuestions.length,
          questions: publicQuestions,
        },
        null,
        2
      ),
      "utf-8"
    );

    console.log(`\n파일 저장 완료: ${OUTPUT_FILE}`);

    // 샘플 출력
    console.log("\n=== 질문 샘플 (처음 10개) ===");
    publicQuestions.slice(0, 10).forEach((q, i) => {
      console.log(`${i + 1}. [${q.status}] ${q.title.substring(0, 100)}`);
      console.log(`   날짜: ${q.date}`);
    });
  } catch (err) {
    console.error("크롤링 오류:", err);
  } finally {
    await browser.close();
  }
};

crawlQnaFromBrand().catch(console.error);
