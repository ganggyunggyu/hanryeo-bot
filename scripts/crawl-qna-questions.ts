import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const TARGET_URL = "https://brand.naver.com/chundamon/products/7420646317";
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

const crawlQnaPage = async () => {
  console.log("=== Q&A 질문 크롤링 시작 ===");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    console.log("페이지 로딩 중...");
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60000 });
    await delay(5000);

    // Q&A 탭 대기 및 클릭
    console.log("Q&A 탭 찾는 중...");
    const qnaTab = await page
      .waitForSelector('[data-name="QNA"]', { timeout: 15000 })
      .catch(() => null);

    if (!qnaTab) {
      console.log("⚠️ Q&A 탭을 찾을 수 없습니다.");

      // 페이지에 있는 모든 탭 버튼 출력
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

    // Q&A 섹션 로드 대기
    console.log("Q&A 섹션 로딩 대기 중...");
    await page.waitForSelector('[id*="QNA"]', { timeout: 10000 }).catch(() => {
      console.log("⚠️ Q&A 섹션이 로드되지 않았습니다.");
    });
    await delay(2000);

    // 질문 리스트 컨테이너 찾기
    console.log("질문 리스트 컨테이너 찾는 중...");
    const listContainerExists = await page
      .waitForSelector("li[role='presentation']", { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!listContainerExists) {
      console.log("⚠️ 질문 리스트를 찾을 수 없습니다.");
      return;
    }

    const allQuestions: QnaQuestion[] = [];
    let currentPage = 1;
    const maxPages = 50; // 4,387개 수집을 위해 페이지 많이

    while (currentPage <= maxPages) {
      console.log(`\n[페이지 ${currentPage}] 크롤링 중...`);

      // 현재 페이지의 질문 리스트 추출 (더 유연한 셀렉터 사용)
      const questions = await page.evaluate(() => {
        const items = Array.from(
          document.querySelectorAll("li[role='presentation']")
        );

        return items
          .map((item) => {
            // 질문 관련 요소들 찾기 (여러 패턴 시도)
            const titleEl =
              item.querySelector("[class*='title']") ||
              item.querySelector("a") ||
              item.querySelector("div");
            const text = titleEl?.textContent?.trim() || "";

            // 비밀글 체크
            const isSecret = text.includes("비밀글") || text.includes("🔒");

            // 날짜 패턴 찾기 (YYYY.MM.DD 형식)
            const dateMatch = text.match(/\d{4}\.\d{2}\.\d{2}/);
            const date = dateMatch ? dateMatch[0] : "";

            // 상태 체크 (답변완료, 답변대기 등)
            const status = text.includes("답변완료")
              ? "답변완료"
              : text.includes("답변대기")
                ? "답변대기"
                : "";

            return {
              status,
              title: text.substring(0, 200),
              author: "",
              date,
              isSecret,
            };
          })
          .filter((q) => q.title.length > 0);
      });

      console.log(`  → ${questions.length}개 질문 수집`);
      allQuestions.push(...questions);

      console.log(`  현재 총 ${allQuestions.length}개 수집됨`);

      // 페이지네이션 버튼 찾기
      const nextPageButton = await page.$(
        'a[aria-label="다음"], button:has-text("다음"), a:has-text("다음")'
      );

      if (!nextPageButton) {
        console.log("다음 페이지 버튼 없음. 크롤링 종료.");
        break;
      }

      // 버튼이 비활성화되어 있는지 확인
      const isDisabled = await nextPageButton.evaluate(
        (el) =>
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true" ||
          el.classList.contains("disabled")
      );

      if (isDisabled) {
        console.log("마지막 페이지 도달. 크롤링 종료.");
        break;
      }

      // 다음 페이지로 이동
      console.log("  다음 페이지로 이동 중...");
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
      console.log(`${i + 1}. [${q.status}] ${q.title}`);
      console.log(`   작성자: ${q.author} | 날짜: ${q.date}`);
    });
  } catch (err) {
    console.error("크롤링 오류:", err);
  } finally {
    await browser.close();
  }
};

crawlQnaPage().catch(console.error);
