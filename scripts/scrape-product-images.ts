import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OUT_DIR = path.resolve(process.cwd(), "tmp/product-images");

const run = async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 5000 }, locale: "ko-KR" });
  const page = await context.newPage();

  const url = "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await delay(3000);

  const images = await page.$$eval("#prdDetail img, .cont img, .detail_cont img, .prdDetail img", (imgs) =>
    imgs.map((img) => (img as HTMLImageElement).src).filter((src) => src && !src.includes("icon") && !src.includes("btn_"))
  );

  console.log(`상세 이미지 ${images.length}개 발견`);

  // Playwright API request로 다운로드
  const apiContext = context.request;
  for (let i = 0; i < Math.min(images.length, 41); i++) {
    const src = images[i];
    try {
      const res = await apiContext.get(src);
      const buffer = await res.body();
      const ext = src.includes(".png") ? "png" : src.includes(".gif") ? "gif" : "jpg";
      const filePath = path.join(OUT_DIR, `product-${String(i).padStart(2, "0")}.${ext}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`  [${i}] 저장 (${(buffer.length / 1024).toFixed(0)}KB): ${src.split("/").pop()}`);
    } catch (err) {
      console.log(`  [${i}] 실패: ${err instanceof Error ? err.message : err}`);
    }
  }

  await browser.close();
  console.log(`\n저장 완료: ${OUT_DIR}`);
};

run().catch(console.error);
