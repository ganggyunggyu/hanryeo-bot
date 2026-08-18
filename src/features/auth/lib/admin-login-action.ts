import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

const CAFE24_LOGIN_URL = "https://eclogin.cafe24.com/Shop/";

interface AdminLoginParams {
  mallId: string;
  password: string;
}

export const adminLoginAction = async (
  page: Page,
  { mallId, password }: AdminLoginParams,
  onLog?: OnLog
): Promise<ActionResult> => {
  try {
    onLog?.(createLog("info", `어드민 로그인 페이지 이동... (${mallId})`));
    await page.goto(CAFE24_LOGIN_URL, { waitUntil: "domcontentloaded" });
    await delay(2000);

    onLog?.(createLog("info", "대표운영자 모드 확인"));
    const loginMode = await page.$eval("#login_mode", (el) => (el as HTMLInputElement).value);
    if (loginMode !== "1") {
      await page.click('a[onclick*="changeLogin(\'1\')"]');
      await delay(500);
    }

    onLog?.(createLog("info", `아이디 입력: ${mallId}`));
    await page.fill("#mall_id", mallId);
    await delay(300);

    onLog?.(createLog("info", "비밀번호 입력"));
    await page.fill("#userpasswd", password);
    await delay(300);

    onLog?.(createLog("info", "로그인 버튼 클릭"));
    await page.evaluate(() => {
      const formCheck = (window as any).form_check;
      if (typeof formCheck === "function") {
        formCheck();
      } else {
        const btn = document.querySelector("button.btnStrong.large") as HTMLElement;
        if (btn) btn.click();
      }
    });

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
    await delay(2000);

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes("eclogin.cafe24.com/Shop");

    if (!isLoggedIn) {
      const errorMsg = await page.$eval("#normal_msg", (el) => el.textContent?.trim()).catch(() => "");
      onLog?.(createLog("error", `어드민 로그인 실패${errorMsg ? `: ${errorMsg}` : ""}`));
      return { success: false, error: `어드민 로그인 실패${errorMsg ? ` - ${errorMsg}` : " - 로그인 페이지에서 벗어나지 못함"}` };
    }

    onLog?.(createLog("success", `어드민 로그인 완료: ${mallId}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `어드민 로그인 에러: ${message}`));
    return { success: false, error: message };
  }
};
