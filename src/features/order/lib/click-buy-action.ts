import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

export const clickBuyAction = async (
  page: Page,
  _params: Record<string, never>,
  onLog?: OnLog
): Promise<ActionResult<{ orderUrl: string }>> => {
  try {
    onLog?.(createLog("info", "'BUY IT NOW' 클릭"));
    await page.evaluate(() => {
      const btn = document.querySelector(
        'a.btnSubmit[onclick*="product_submit"]'
      ) as HTMLElement;
      if (btn) btn.click();
    });
    await delay(3000);

    const currentUrl = page.url();
    const isOrder =
      currentUrl.includes("/order/") || currentUrl.includes("/basket/");

    if (!isOrder) {
      onLog?.(createLog("error", "주문 페이지 미도달"));
      return { success: false, error: `주문 페이지 미도달: ${currentUrl}` };
    }

    onLog?.(createLog("success", `주문 페이지 도달: ${currentUrl}`));
    return { success: true, data: { orderUrl: currentUrl } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `구매 클릭 실패: ${message}`));
    return { success: false, error: message };
  }
};
