import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

interface VisitProductParams {
  productUrl: string;
}

export const visitProductAction = async (
  page: Page,
  { productUrl }: VisitProductParams,
  onLog?: OnLog
): Promise<ActionResult> => {
  try {
    onLog?.(createLog("info", "제품 페이지 이동..."));
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await delay(2000);

    const title = await page.title();
    onLog?.(createLog("success", `제품 페이지 도달: ${title}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `제품 페이지 이동 실패: ${message}`));
    return { success: false, error: message };
  }
};
