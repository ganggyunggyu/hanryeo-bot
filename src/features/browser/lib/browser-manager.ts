import { chromium } from "playwright";
import type { BrowserSession, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";

export const startSession = async (onLog?: OnLog): Promise<BrowserSession> => {
  onLog?.(createLog("info", "브라우저 실행 중..."));

  const browser = await chromium.launch({
    headless: process.env.HEADLESS === "true",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  onLog?.(createLog("success", "브라우저 준비 완료"));
  return { browser, context };
};

export const endSession = async (session: BrowserSession, onLog?: OnLog) => {
  await session.context.close();
  await session.browser.close();
  onLog?.(createLog("info", "브라우저 종료"));
};
