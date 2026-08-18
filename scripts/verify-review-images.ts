import { chromium } from "playwright";

const PRODUCT_BASE = "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/";
const TARGET_NOS = ["394","392","389","387","385","383","380","377","374","373","370","369","368","366"];

const delayMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const results: { no: string; imageCount: number; author: string; title: string }[] = [];
  const found = new Set<string>();

  for (let pageNo = 1; pageNo <= 8; pageNo++) {
    const url = new URL(PRODUCT_BASE);
    if (pageNo > 1) url.searchParams.set("page_4", String(pageNo));
    url.hash = "use_review";
    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await delayMs(2500);

    const rows = await page.$$eval("tr", (trs) =>
      trs.map((tr) => {
        const noCell = tr.querySelector("td.RW");
        const subjectA = tr.querySelector("td.subject a[href], td.left.txtBreak a[href]") as HTMLAnchorElement | null;
        const tds = Array.from(tr.querySelectorAll("td"));
        const sIdx = tds.findIndex((td) => td.classList.contains("subject") || td.querySelector("a[href*='board_no=4']"));
        const authorTd = sIdx >= 0 ? tds[sIdx + 1] : null;
        if (!noCell || !subjectA) return null;
        return {
          displayNo: (noCell.textContent || "").trim(),
          title: (subjectA.textContent || "").trim(),
          author: (authorTd?.textContent || "").trim(),
          href: subjectA.getAttribute("href") || "",
        };
      }).filter(Boolean),
    ) as { displayNo: string; title: string; author: string; href: string }[];

    console.log(`페이지 ${pageNo}: ${rows.length}개 리뷰`);

    for (const row of rows) {
      const urlNo = row.href.match(/no=(\d+)/)?.[1];
      if (!urlNo || !TARGET_NOS.includes(urlNo) || found.has(urlNo)) continue;

      const clicked = await page.evaluate((targetNo) => {
        const allRows = Array.from(document.querySelectorAll("tr"));
        const target = allRows.find((r) => {
          const a = r.querySelector("td.subject a[href], td.left.txtBreak a[href]") as HTMLAnchorElement | null;
          return a && (a.getAttribute("href") || "").includes("no=" + targetNo);
        });
        const link = target?.querySelector("td.subject a[href], td.left.txtBreak a[href]") as HTMLAnchorElement | null;
        if (link) { link.click(); return true; }
        return false;
      }, urlNo);

      if (!clicked) {
        results.push({ no: urlNo, imageCount: -1, author: row.author, title: row.title });
        found.add(urlNo);
        continue;
      }
      await delayMs(1500);

      const imgCount = await page.evaluate((targetNo) => {
        const allRows = Array.from(document.querySelectorAll("tr"));
        const targetIdx = allRows.findIndex((r) => {
          const a = r.querySelector("td.subject a[href], td.left.txtBreak a[href]") as HTMLAnchorElement | null;
          return a && (a.getAttribute("href") || "").includes("no=" + targetNo);
        });
        if (targetIdx < 0) return 0;
        let imgs = 0;
        for (let i = targetIdx + 1; i < allRows.length; i++) {
          if (allRows[i].querySelector("td.RW")) break;
          imgs += allRows[i].querySelectorAll("img:not([src*='icon-star'])").length;
        }
        return imgs;
      }, urlNo);

      results.push({ no: urlNo, imageCount: imgCount, author: row.author, title: row.title });
      found.add(urlNo);
      console.log(`  no=${urlNo} (${row.displayNo}) ${row.author} → ${imgCount}장`);
    }

    if (found.size >= TARGET_NOS.length) break;
  }

  await browser.close();

  console.log("\n=== 리뷰 이미지 검증 결과 ===");
  const sorted = results.sort((a, b) => parseInt(b.no) - parseInt(a.no));
  let okCount = 0;
  for (const r of sorted) {
    const status = r.imageCount > 0 ? "OK" : "NO IMG";
    if (r.imageCount > 0) okCount++;
    console.log(`  no=${r.no} | ${r.author} | ${r.title.substring(0, 25)} | 이미지: ${r.imageCount}장 | ${status}`);
  }
  console.log(`\n총: ${results.length}/${TARGET_NOS.length} 확인, 이미지 있음: ${okCount}/${results.length}`);

  const missing = TARGET_NOS.filter((no) => !found.has(no));
  if (missing.length > 0) console.log("미확인:", missing.join(", "));
};

run().catch(console.error);
