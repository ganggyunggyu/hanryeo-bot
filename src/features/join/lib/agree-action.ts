import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

interface AgreeParams {
  baseUrl: string;
}

export const agreeAction = async (
  page: Page,
  { baseUrl }: AgreeParams,
  onLog?: OnLog
): Promise<ActionResult> => {
  try {
    onLog?.(createLog("info", "약관동의 페이지 이동..."));
    await page.goto(`${baseUrl}/member/agreement.html`, {
      waitUntil: "domcontentloaded",
    });
    await delay(1000);

    onLog?.(createLog("info", "전체 동의 클릭"));
    await page.click("#sAgreeAllChecked");
    await delay(500);

    onLog?.(createLog("info", "'다음' 버튼 클릭"));
    await page.click("button.btnSubmitFix");
    await page.waitForURL("**/member/join.html**", { timeout: 10000 });

    onLog?.(createLog("success", "약관동의 완료 → 가입 폼 도달"));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `약관동의 실패: ${message}`));
    return { success: false, error: message };
  }
};
