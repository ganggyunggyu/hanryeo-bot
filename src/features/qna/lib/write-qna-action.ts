import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";
import { Solver } from "2captcha-ts";

interface WriteQnaParams {
  title: string;
  content: string;
  captchaApiKey: string;
}

const QNA_WRITE_URL =
  "https://hanryeodamwon.com/board/product/write.html?board_no=6&product_no=9&cate_no=30&display_group=1";

const solveCaptchaImage = async (imageBase64: string, apiKey: string): Promise<string> => {
  const solver = new Solver(apiKey);
  const result = await solver.imageCaptcha({
    body: imageBase64,
    numeric: 0,
    minLen: 4,
    maxLen: 8,
  });
  return result.data;
};

export const writeQnaAction = async (
  page: Page,
  { title, content, captchaApiKey }: WriteQnaParams,
  onLog?: OnLog,
): Promise<ActionResult> => {
  try {
    page.on("dialog", async (dialog) => {
      onLog?.(createLog("info", `[팝업] ${dialog.type()}: ${dialog.message()}`));
      if (dialog.type() === "confirm") {
        await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    });

    // 1. QNA 작성 페이지 이동
    onLog?.(createLog("info", "QNA 작성 페이지 이동"));
    await page.goto(QNA_WRITE_URL, { waitUntil: "domcontentloaded" });
    await delay(3000);

    // 2. 제목 입력
    onLog?.(createLog("info", `제목 입력: ${title}`));
    await page.fill("#subject", title);
    await delay(300);

    // 3. 본문 입력 (Froala)
    onLog?.(createLog("info", "본문 입력"));
    await page.waitForSelector("#content_IFRAME", { timeout: 10000 });
    await delay(2000);

    await page.evaluate((text) => {
      const instance = (window as any).EC_FROALA_INSTANCE;
      if (instance && instance.el) {
        const html = text
          .split("\n\n")
          .map((p: string) => `<p>${p}</p>`)
          .join("");
        instance.el.innerHTML = instance.clean.html(html);
        instance.undo.saveStep();
      }
    }, content);
    await delay(500);

    // 4. textarea 동기화
    await page.evaluate(() => {
      const instance = (window as any).EC_FROALA_INSTANCE;
      if (instance) {
        const html = instance.el.innerHTML;
        const textarea = document.getElementById("content") as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = html.replace(/\sclass=("|')fr-draggable("|')|\s?fr-draggable\s?|<\/?null>/gi, "");
        }
      }
    });
    onLog?.(createLog("success", "본문 입력 완료"));

    // 5. 캡차 풀이
    onLog?.(createLog("info", "캡차 이미지 캡처"));
    const captchaImg = await page.waitForSelector("#captcha_Write", { timeout: 10000 });
    if (!captchaImg) throw new Error("캡차 이미지를 찾지 못함");

    const imageBuffer = await captchaImg.screenshot();
    const imageBase64 = imageBuffer.toString("base64");

    onLog?.(createLog("info", "2Captcha 풀이 요청"));
    const solvedText = await solveCaptchaImage(imageBase64, captchaApiKey);
    onLog?.(createLog("success", `캡차 풀이 완료: ${solvedText}`));

    await page.fill("#captcha", solvedText);
    await delay(500);

    // 6. 등록
    onLog?.(createLog("info", "등록 버튼 클릭"));
    await page.evaluate(() => {
      (window as any).BOARD_WRITE.form_submit("boardWriteForm");
    });
    await delay(5000);

    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes("/write.html");

    if (!isSuccess) {
      throw new Error("QNA 등록 실패 - 작성 페이지에서 벗어나지 못함");
    }

    onLog?.(createLog("success", `QNA 등록 완료: ${currentUrl}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `QNA 작성 실패: ${message}`));
    return { success: false, error: message };
  }
};
