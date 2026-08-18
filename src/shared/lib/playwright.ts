import { chromium, type Browser, type BrowserContext } from "playwright";

export const launchBrowser = async (): Promise<Browser> => {
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return browser;
};

export const createContext = async (browser: Browser): Promise<BrowserContext> => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  return context;
};
