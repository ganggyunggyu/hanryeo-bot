import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

interface LoginParams {
  baseUrl: string;
  id: string;
  password: string;
}

export const loginAction = async (
  page: Page,
  { baseUrl, id, password }: LoginParams,
  onLog?: OnLog
): Promise<ActionResult> => {
  try {
    onLog?.(createLog("info", `로그인 페이지 이동... (${id})`));
    await page.goto(`${baseUrl}/member/login.html`, {
      waitUntil: "domcontentloaded",
    });
    await delay(1500);

    onLog?.(createLog("info", `아이디 입력: ${id}`));
    await page.fill("#member_id", id);
    await delay(200);

    onLog?.(createLog("info", "비밀번호 입력"));
    await page.fill("#member_passwd", password);
    await delay(200);

    onLog?.(createLog("info", "로그인 버튼 클릭"));
    await page.evaluate(() => {
      const btn = document.querySelector(
        'a.btnSubmit[onclick*="MemberAction.login"]'
      ) as HTMLElement;
      if (btn) btn.click();
    });
    await delay(3000);

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes("/member/login.html");

    if (!isLoggedIn) {
      onLog?.(createLog("error", "로그인 실패"));
      return { success: false, error: "로그인 실패 - 로그인 페이지에서 벗어나지 못함" };
    }

    onLog?.(createLog("success", `로그인 완료: ${id}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `로그인 에러: ${message}`));
    return { success: false, error: message };
  }
};
