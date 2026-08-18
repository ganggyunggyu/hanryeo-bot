import { getLegacyAccountPassword } from "./src/shared/config/credentials";
import { chromium } from "playwright";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://hanryeodamwon.com";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const accId = process.argv[2] ?? "jheelight88";
const accPassword = process.argv[3] ?? getLegacyAccountPassword();

const ACCOUNT_NAMES: Record<string, string> = {
  jheelight88: "이정희",
  mjpark620: "박명자",
};

const REVIEWS: Record<string, { title: string; content: string }> = {
  jheelight88: {
    title: "포장 깔끔하고 먹기 편해요!",
    content: `포장이 깔끔하고 꼼꼼하게 잘 되어서 왔어요!
박스 열자마자 고급스럽다는 느낌이 들더라구요 ㅎㅎ
도착하자마자 궁금해서 한 포 먼저
먹어봤는데 비위가 약한 편이라 걱정했는데
누린내도 없고 먹기 편해서 좋았어요!!

흑염소에 한약재까지 들어간다고 해서
성분 하나하나 꼼꼼히 비교해보고 여기가 가격 대비
제일 괜찮아보여서 주문했거든요!

살림하면서 건강식품까지 챙기기 부담스러웠는데 합리적인 가격에
좋은 제품 구할 수 있었네용.
남편한테도 꾸준히 챙겨먹이려구요^^~`,
  },
  mjpark620: {
    title: "시어머니 추천으로 구매했어요",
    content: `시어머니가 먼저 드시고 추천해주셔서 구입하게 됐어요.
시어머니도 무릎 수술 후에 기력 회복하려고 드셨는데 확실히
입맛도 돌아오고 몸이 가벼워지셨다고 하시더라고요.

저도 올해 초 수술하고 나서 체력이 뚝 떨어져서 뭐라도
챙겨먹어야겠다 싶었는데 시어머니 말씀 듣고 한려담원 흑염소
진액 30포 주문해서 꾸준히 먹었어요. 먹기 시작하니까 신기하게
바로 입맛이 돌아오고 소화가 잘 되더라고요. 아침마다 속이
편하게 비워지니까 그것만으로도 컨디션이 확 달라지는
느낌이에요.

한 달쯤 먹었을 때 피부가 매끄러워진 게 느껴졌는데 처음엔
화장품 바꾼 건가 싶었거든요. 근데 시어머니도 똑같이 피부가
좋아졌다고 하셔서 이건 흑염소 덕인가보다 싶었어요.

전자레인지에 30초 정도 데워서 따뜻하게 마시면 누린내 전혀 없고
구수한 차 한 잔 마시는 느낌이라 부담이 없어요.
어차피 꾸준히 챙길거.. 60포 추가로 더 주문해서 계속 먹어보려고 합니다. ^^
좋은 제품 만들어주셔서 감사해요. ㅎㅎ`,
  },
};

const review = REVIEWS[accId];
if (!review) { console.log(`리뷰 데이터 없음: ${accId}`); process.exit(1); }
const accName = ACCOUNT_NAMES[accId] ?? "";

const run = async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: "ko-KR" });
  const page = await context.newPage();

  let dialogMsg = "";
  page.on("dialog", async (d) => {
    dialogMsg = d.message();
    console.log(`[팝업] ${d.type()}: ${dialogMsg.slice(0, 150)}`);
    await d.accept();
  });

  // 1. 로그인
  await page.goto(`${BASE_URL}/member/login.html`, { waitUntil: "domcontentloaded" });
  await delay(1500);
  await page.fill("#member_id", accId);
  await page.fill("#member_passwd", accPassword);
  await page.evaluate(() => {
    const btn = document.querySelector('a.btnSubmit[onclick*="MemberAction.login"]') as HTMLElement;
    if (btn) btn.click();
  });
  await delay(3000);
  console.log(`로그인 완료: ${accName} (${accId})`);

  // 2. myshop/board_list.html에서 리뷰 게시글 찾기
  await page.goto(`${BASE_URL}/myshop/board_list.html`, { waitUntil: "domcontentloaded" });
  await delay(2000);

  const existingReview = await page.evaluate(() => {
    const rows = document.querySelectorAll("table tbody tr");
    const results: { board: string; title: string; href: string }[] = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;
      const board = cells[0]?.textContent?.trim() ?? "";
      const anchor = row.querySelector("a") as HTMLAnchorElement;
      const title = anchor?.textContent?.trim() ?? "";
      const href = anchor?.href ?? "";
      if (board.includes("리뷰") || board.includes("후기") || href.includes("board_no=4")) {
        results.push({ board, title, href });
      }
    });
    return results[0] ?? null;
  });

  if (!existingReview) {
    console.log("기존 리뷰를 찾을 수 없음 — myshop에 리뷰 게시글 없음");
    await browser.close();
    return;
  }

  console.log(`기존 리뷰: "${existingReview.title}"`);
  console.log(`href: ${existingReview.href}`);

  // 3. myshop에서 리뷰 링크 클릭 → 상품 리뷰 상세 페이지로 이동
  await page.evaluate((href) => {
    const links = document.querySelectorAll("a");
    for (const a of links) {
      if (a.href === href) {
        a.click();
        return;
      }
    }
    // fallback: href 일부로 매칭
    for (const a of links) {
      if (a.href?.includes("board_no=4") && (a.textContent?.trim() || "").length > 3) {
        a.click();
        return;
      }
    }
  }, existingReview.href);
  await delay(4000);

  console.log(`리뷰 상세 페이지: ${page.url()}`);
  await page.screenshot({ path: `debug-review-detail-${accId}.png`, fullPage: true });

  // 4. 상세 페이지에서 수정 버튼 찾기
  const pageLinks = await page.evaluate(() => {
    const links = document.querySelectorAll("a");
    return Array.from(links)
      .filter((a) => a.textContent?.includes("수정") || a.href?.includes("modify"))
      .map((a) => ({ text: a.textContent?.trim() ?? "", href: a.href ?? "", className: a.className }));
  });
  console.log("수정 관련 링크:", JSON.stringify(pageLinks, null, 2));

  // 수정 버튼 클릭
  dialogMsg = "";
  const modifyClicked = await page.evaluate(() => {
    const links = document.querySelectorAll("a");
    for (const a of links) {
      const text = a.textContent?.trim() ?? "";
      const href = a.href ?? "";
      if ((text === "수정" || href.includes("modify")) && href.includes("board_no=4")) {
        (a as HTMLElement).click();
        return true;
      }
    }
    // fallback: 수정 텍스트가 있는 아무 링크
    for (const a of links) {
      if (a.textContent?.trim() === "수정" && a.href?.includes("modify")) {
        (a as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (!modifyClicked) {
    console.log("수정 버튼 찾지 못함");
    await page.screenshot({ path: `debug-no-modify-${accId}.png`, fullPage: true });
    await browser.close();
    return;
  }

  await delay(4000);

  if (dialogMsg.includes("본인이 작성하지 않은") || dialogMsg.includes("잘못된 접근")) {
    console.log(`수정 실패: ${dialogMsg}`);
    await browser.close();
    return;
  }

  console.log(`수정 폼 페이지: ${page.url()}`);
  await page.screenshot({ path: `debug-modify-form-${accId}.png` });

  // URL이 modify 페이지인지 확인
  if (!page.url().includes("modify")) {
    console.log("수정 페이지 이동 실패 — URL 확인");
    await browser.close();
    return;
  }

  // 5. EC_FROALA_INSTANCE 대기
  for (let i = 0; i < 20; i++) {
    const hasFroala = await page.evaluate(() => !!(window as any).EC_FROALA_INSTANCE);
    if (hasFroala) break;
    await delay(500);
  }

  // 6. 제목 입력
  await page.fill("#subject", review.title);
  console.log(`제목: ${review.title}`);

  // 7. 본문 입력
  await page.evaluate((content) => {
    const instance = (window as any).EC_FROALA_INSTANCE;
    if (instance?.el) {
      const html = content
        .split("\n\n")
        .map((para: string) => `<p>${para.split("\n").join("<br>")}</p>`)
        .join("");
      instance.el.innerHTML = html;
    }
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (textarea && instance?.el) textarea.value = instance.el.innerHTML;
  }, review.content);
  console.log("본문 입력 완료");

  await delay(1000);
  await page.screenshot({ path: `review-filled-${accId}.png` });

  // 8. 제출
  await page.evaluate(() => {
    const instance = (window as any).EC_FROALA_INSTANCE;
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (textarea && instance?.el) textarea.value = instance.el.innerHTML;
    try {
      (window as any).BOARD_WRITE.form_submit("boardWriteForm");
    } catch {
      const btn = document.querySelector("a.btnSubmit, .btnArea a.btnStrong") as HTMLElement;
      if (btn) btn.click();
    }
  });
  await delay(5000);

  const finalUrl = page.url();
  console.log(`최종 URL: ${finalUrl}`);
  await page.screenshot({ path: `review-done-${accId}.png` });

  const success = !finalUrl.includes("write") && !finalUrl.includes("modify");
  console.log(success ? "리뷰 수정 완료!" : "실패 — 스크린샷 확인");

  await page.close();
  await context.close();
  await browser.close();
};

run().catch(console.error);
