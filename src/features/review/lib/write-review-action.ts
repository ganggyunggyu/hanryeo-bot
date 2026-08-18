import type { ElementHandle, Frame, Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay, randomInt } from "@/shared/lib/random";
import { upsertReviewRef } from "@/features/join/lib/account-storage";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

interface ReviewImageCandidate {
  fullPath: string;
}

interface ClipboardImagePayload {
  name: string;
  mimeType: string;
  base64: string;
}

interface WriteReviewParams {
  accountId?: string;
  accountName?: string;
  title: string;
  content: string;
  enableImageUpload?: boolean;
  forceImageUpload?: boolean;
  imageRootDirectories?: string[];
  imageOnly?: boolean;
  explicitImagePaths?: string[];
}

const DEFAULT_REVIEW: WriteReviewParams = {
  title: "인스타에서 보고 구매했어요",
  content:
    "아이 둘 키우면서 체력이 예전 같지 않아서 건강관리에 관심이 많아졌는데 인스타랑 유튜브에서 한려담원 흑염소 진액이 계속 눈에 띄더라고요. 흑염소 진액이 기력 회복에 좋다는 정보를 많이 접하게 됐고 주문해봤습니다. 기대하고 먹어볼게요!",
};

const IMAGE_ROOTS = [
  process.cwd(),
  path.resolve(process.cwd(), "한려담원_리뷰사진"),
  path.resolve(process.cwd(), "images"),
  path.resolve(process.cwd(), "review-images"),
];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const IMAGE_SELECT_WINDOW = 30;
const IMAGE_SELECT_COUNT = 16;
const IMAGE_MIN_COUNT = 1;
const IMAGE_MAX_COUNT = 2;
const RECENT_REVIEW_LIMIT = 30;

const REVIEW_LIST_PATHS = ["/myshop/board_list.html?board_no=4", "/board/product/list.html?board_no=4"];
const REVIEW_EDIT_LINK_SELECTORS = [
  "a[href*='/board/product/modify.html']",
  "a[href*='board/product/modify.html']",
  "a[href*='modify'][href*='board_no=4']",
  "a:has-text('수정')",
];
const REVIEW_DETAIL_LINK_SELECTORS = [
  "a[href*='/board/product/read.html'][href*='board_no=4']",
  "a[href*='board/product/read.html'][href*='board_no=4']",
  "a[href*='board_no=4'][href*='no=']",
];

let reviewSequence = 0;
let windowImageIndexes = new Set<number>();
const usedImageNumberPrefixes = new Set<string>();

const shuffle = <T>(items: T[]): T[] => {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
};

const toAbsoluteUrl = (href: string | null, baseUrl: string): string | null => {
  if (!href || href.startsWith("javascript:")) return null;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
};

const parseReviewIdentifiers = (
  url: string,
): { reviewNo?: string; boardNo?: string; productNo?: string } => {
  try {
    const parsed = new URL(url);
    const reviewNo = parsed.searchParams.get("no") ?? undefined;
    const boardNo = parsed.searchParams.get("board_no") ?? undefined;
    const productNo =
      parsed.searchParams.get("link_product_no") ??
      parsed.searchParams.get("product_no") ??
      undefined;
    return { reviewNo, boardNo, productNo };
  } catch {
    return {};
  }
};

const getMimeTypeFromPath = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
};

const shouldUploadImage = (): boolean => {
  reviewSequence += 1;
  const position = ((reviewSequence - 1) % IMAGE_SELECT_WINDOW) + 1;
  if (position === 1 || windowImageIndexes.size === 0) {
    const window = Array.from({ length: IMAGE_SELECT_WINDOW }, (_, i) => i + 1);
    windowImageIndexes = new Set(shuffle(window).slice(0, Math.min(IMAGE_SELECT_COUNT, IMAGE_SELECT_WINDOW)));
  }

  return windowImageIndexes.has(position);
};

const getImageCandidatesFromRoots = (roots: string[]): ReviewImageCandidate[] => {
  const candidates: ReviewImageCandidate[] = [];
  const seen = new Set<string>();

  for (const dir of roots) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;

    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;

      const ext = path.extname(file.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;

      const fullPath = path.resolve(dir, file.name);
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);
      candidates.push({ fullPath });
    }
  }

  return candidates;
};

const pickRandomImages = (imageRoots: string[]): string[] => {
  const candidates = getImageCandidatesFromRoots(imageRoots);
  if (candidates.length === 0) return [];

  const parsePrefix = (filePath: string): string | null => {
    const baseName = path.basename(filePath);
    const numericPrefix = baseName.match(/^(\d+)[-_]/)?.[1];
    return numericPrefix ?? null;
  };

  const groupedByPrefix = new Map<string, ReviewImageCandidate[]>();
  for (const candidate of candidates) {
    const prefix = parsePrefix(candidate.fullPath);
    if (!prefix) continue;
    if (!groupedByPrefix.has(prefix)) groupedByPrefix.set(prefix, []);
    groupedByPrefix.get(prefix)?.push(candidate);
  }

  const availablePrefixes = Array.from(groupedByPrefix.keys()).filter(
    (prefix) => !usedImageNumberPrefixes.has(prefix),
  );
  if (availablePrefixes.length === 0) return [];

  const prefix = shuffle(availablePrefixes)[0];
  const group = groupedByPrefix.get(prefix) || [];
  const webpGroup = group.filter((candidate) => path.extname(candidate.fullPath).toLowerCase() === ".webp");
  const pool = webpGroup.length > 0 ? webpGroup : group;
  if (pool.length === 0) return [];

  const count = randomInt(IMAGE_MIN_COUNT, Math.min(IMAGE_MAX_COUNT, pool.length));
  const selected = shuffle(pool).slice(0, count);
  usedImageNumberPrefixes.add(prefix);

  return selected.map((candidate) => candidate.fullPath);
};

const logSelectedImages = (imagePaths: string[], onLog?: OnLog): void => {
  if (imagePaths.length === 0) {
    onLog?.(createLog("warn", "루트 이미지 파일이 없어 이미지 업로드를 스킵함"));
    return;
  }

  const imageNames = imagePaths.map((imagePath) => path.basename(imagePath)).join(", ");
  onLog?.(createLog("info", `리뷰 이미지 선택: ${imageNames}`));
};

const findFirstHrefBySelectors = async (page: Page, selectors: string[]): Promise<string | null> => {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (!element) continue;

      const href = await element.getAttribute("href");
      const absoluteUrl = toAbsoluteUrl(href, page.url());
      if (absoluteUrl) return absoluteUrl;
    } catch {
      continue;
    }
  }

  return null;
};

const collectCandidateEditUrls = async (page: Page): Promise<string[]> => {
  try {
  const baseUrl = page.url();
  const links = await page.$$eval("a[href]", (elements) =>
    elements
      .map((element) => (element as HTMLAnchorElement).getAttribute("href"))
      .filter((href): href is string => Boolean(href))
  );

  const absolute = links
    .map((href) => toAbsoluteUrl(href, baseUrl))
    .filter((href): href is string => Boolean(href))
    .filter((href) => href.includes("/board/product/modify.html") && href.includes("board_no=4"));
  const unique = Array.from(new Set(absolute));
  return unique.sort((a, b) => {
    const aHasProductNo = a.includes("link_product_no=");
    const bHasProductNo = b.includes("link_product_no=");
    if (aHasProductNo === bHasProductNo) return 0;
    return aHasProductNo ? -1 : 1;
  });
  } catch {
    return [];
  }
};

const collectCandidateDetailUrls = async (page: Page): Promise<string[]> => {
  try {
  const baseUrl = page.url();
  const links = await page.$$eval("a[href]", (elements) =>
    elements
      .map((element) => (element as HTMLAnchorElement).getAttribute("href"))
      .filter((href): href is string => Boolean(href))
  );

  const absolute = links
    .map((href) => toAbsoluteUrl(href, baseUrl))
    .filter((href): href is string => Boolean(href))
    .filter((href) => href.includes("board_no=4") && (href.includes("/article/") || href.includes("/board/product/read.html")));

  return Array.from(new Set(absolute));
  } catch {
    return [];
  }
};

const collectReviewDetailItems = async (
  page: Page,
): Promise<Array<{ reviewNo: string; url: string; text: string; author: string }>> => {
  const baseUrl = page.url();
  const rows = await page.$$eval("tr", (elements) =>
    elements
      .map((row) => {
        const reviewNoCell = row.querySelector("td.RW");
        const subjectLink = row.querySelector("td.subject a[href], td.left.txtBreak a[href]") as
          | HTMLAnchorElement
          | null;
        if (!reviewNoCell || !subjectLink) return null;

        const tds = Array.from(row.querySelectorAll("td"));
        const subjectIdx = tds.findIndex((td) => td.classList.contains("subject") || td.querySelector("a[href*='board_no=4']"));
        const authorTd = subjectIdx >= 0 ? tds[subjectIdx + 1] : null;

        const reviewNo = (reviewNoCell.textContent || "").trim();
        const href = subjectLink.getAttribute("href") || subjectLink.href || "";
        const text = (subjectLink.textContent || "").trim();
        const author = (authorTd?.textContent || "").trim();
        if (!reviewNo || !href) return null;

        return { reviewNo, href, text, author };
      })
      .filter(
        (item): item is { reviewNo: string; href: string; text: string; author: string } =>
          Boolean(item?.reviewNo) && Boolean(item?.href),
      ),
  );

  return rows
    .map((item) => ({
      reviewNo: item.reviewNo,
      url: toAbsoluteUrl(item.href, baseUrl),
      text: item.text,
      author: item.author,
    }))
    .filter((item): item is { reviewNo: string; url: string; text: string; author: string } => Boolean(item.url))
    .filter((item, index, array) => array.findIndex((v) => v.reviewNo === item.reviewNo) === index);
};

const clickReviewSubjectByNo = async (page: Page, reviewNo: string): Promise<boolean> => {
  return page.evaluate((targetReviewNo) => {
    const rows = Array.from(document.querySelectorAll("tr"));
    const targetRow = rows.find((row) => {
      const noCell = row.querySelector("td.RW");
      return (noCell?.textContent || "").trim() === targetReviewNo;
    });

    if (targetRow) {
      const rowLink = targetRow.querySelector("td.subject a[href], td.left.txtBreak a[href]") as
        | HTMLAnchorElement
        | null;
      if (rowLink) {
        rowLink.click();
        return true;
      }
    }

    const anchors = Array.from(
      document.querySelectorAll("td.subject a[href*='board_no=4'], a[href*='/article/'][href*='board_no=4']"),
    ) as HTMLAnchorElement[];

    const target = anchors.find((anchor) => {
      const href = anchor.getAttribute("href") || "";
      return href.includes(`no=${targetReviewNo}`) || href.includes(`/4/${targetReviewNo}/`);
    });

    if (!target) return false;
    target.click();
    return true;
  }, reviewNo);
};

const clickExpandedRowModifyByNo = async (page: Page, reviewNo: string): Promise<string | null> => {
  return page.evaluate((targetReviewNo) => {
    const rows = Array.from(document.querySelectorAll("tr"));
    const targetRow = rows.find((row) => {
      const noCell = row.querySelector("td.RW");
      return (noCell?.textContent || "").trim() === targetReviewNo;
    });

    if (targetRow) {
      let cursor: Element | null = targetRow.nextElementSibling;
      while (cursor) {
        if (cursor.querySelector("td.RW")) break;
        const rowLinks = Array.from(
          cursor.querySelectorAll("a[href*='/board/product/modify.html'][href*='board_no=4']"),
        ) as HTMLAnchorElement[];
        if (rowLinks.length > 0) {
          let selected: HTMLAnchorElement | null = null;
          for (const link of rowLinks) {
            const style = window.getComputedStyle(link);
            const hiddenByClass = (link.className || "").includes("displaynone");
            const hiddenByStyle = style.display === "none" || style.visibility === "hidden";
            if (!(hiddenByClass || hiddenByStyle)) {
              selected = link;
              break;
            }
          }
          if (!selected) selected = rowLinks[0] ?? null;
          if (selected) {
            selected.click();
            return selected.getAttribute("href") || selected.href || null;
          }
        }
        cursor = cursor.nextElementSibling;
      }
    }

    const fallbackLinks = Array.from(
      document.querySelectorAll("a[href*='/board/product/modify.html'][href*='board_no=4']"),
    ) as HTMLAnchorElement[];
    let selected: HTMLAnchorElement | null = null;
    for (const link of fallbackLinks) {
      const style = window.getComputedStyle(link);
      const hiddenByClass = (link.className || "").includes("displaynone");
      const hiddenByStyle = style.display === "none" || style.visibility === "hidden";
      if (!(hiddenByClass || hiddenByStyle)) {
        selected = link;
        break;
      }
    }
    if (!selected) selected = fallbackLinks[0] ?? null;
    if (!selected) return null;
    selected.click();
    return selected.getAttribute("href") || selected.href || null;
  }, reviewNo);
};

const clickModifyLinkByAbsoluteUrl = async (page: Page, targetUrl: string): Promise<boolean> => {
  return page.evaluate((url) => {
    const links = Array.from(
      document.querySelectorAll("a[href*='/board/product/modify.html'][href*='board_no=4']"),
    ) as HTMLAnchorElement[];

    const target = links.find((link) => {
      const href = link.getAttribute("href");
      if (!href) return false;
      try {
        return new URL(href, window.location.href).toString() === url;
      } catch {
        return false;
      }
    });

    if (!target) return false;
    target.click();
    return true;
  }, targetUrl);
};

const buildReviewPageUrl = (baseUrl: string, pageNo: number): string => {
  const parsed = new URL(baseUrl);
  if (pageNo > 1) {
    parsed.searchParams.set("page_4", String(pageNo));
  } else {
    parsed.searchParams.delete("page_4");
  }
  parsed.hash = "use_review";
  return parsed.toString();
};

const findEditUrlFromRecentProductPages = async (
  page: Page,
  onLog?: OnLog,
  maxPages = 6,
  surname?: string,
): Promise<string | null> => {
  const baseProductUrl = page.url().split("#")[0].split("?")[0];
  const seenReviewNos = new Set<string>();
  let attempted = 0;

  for (let pageNo = 1; pageNo <= maxPages && attempted < RECENT_REVIEW_LIMIT; pageNo++) {
    if (pageNo > 1) {
      const pageUrl = buildReviewPageUrl(baseProductUrl, pageNo);
      onLog?.(createLog("info", `리뷰 페이지 ${pageNo} 이동`));
      await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
      await delay(2000);
    }

    const queue = await collectReviewDetailItems(page);
    if (queue.length === 0) {
      onLog?.(createLog("info", `페이지 ${pageNo}: 리뷰 없음, 탐색 종료`));
      break;
    }

    const filtered = surname
      ? queue.filter((item) => item.author.startsWith(surname))
      : queue;

    onLog?.(createLog("info", `페이지 ${pageNo}: ${queue.length}개 리뷰${surname ? ` (성씨 '${surname}' 필터 → ${filtered.length}개)` : ""}에서 수정 대상 탐색`));

    for (const item of filtered) {
      if (attempted >= RECENT_REVIEW_LIMIT) return null;
      if (seenReviewNos.has(item.reviewNo)) continue;
      seenReviewNos.add(item.reviewNo);
      attempted += 1;

      onLog?.(createLog("info", `리뷰 ${item.reviewNo} (${item.author}) 클릭 시도`));
      const clicked = await clickReviewSubjectByNo(page, item.reviewNo);
      if (!clicked) continue;

      await delay(900);
      const editHref = await clickExpandedRowModifyByNo(page, item.reviewNo);
      const editUrl = toAbsoluteUrl(editHref, page.url());
      if (!editUrl) {
        if (pageNo > 1) {
          const returnUrl = buildReviewPageUrl(baseProductUrl, pageNo);
          await page.goto(returnUrl, { waitUntil: "domcontentloaded" });
          await delay(1500);
        } else {
          await page.goto(baseProductUrl + "#use_review", { waitUntil: "domcontentloaded" });
          await delay(1500);
        }
        continue;
      }

      onLog?.(createLog("info", `리뷰 수정 시도: ${editUrl}`));
      await delay(1200);
      if (await canEditCurrentPage(page)) {
        return editUrl;
      }

      if (pageNo > 1) {
        const returnUrl = buildReviewPageUrl(baseProductUrl, pageNo);
        await page.goto(returnUrl, { waitUntil: "domcontentloaded" });
        await delay(1500);
      } else {
        await page.goto(baseProductUrl + "#use_review", { waitUntil: "domcontentloaded" });
        await delay(1500);
      }
    }
  }

  return null;
};

const canEditCurrentPage = async (page: Page): Promise<boolean> => {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
    const subject = await page.$("#subject");
    return Boolean(subject);
  } catch {
    return false;
  }
};

const resolveReviewEditUrl = async (
  page: Page,
  _accountId: string | undefined,
  onLog?: OnLog,
  accountName?: string,
): Promise<string | null> => {
  if (page.url().includes("/board/product/modify.html")) return page.url();
  const startUrl = page.url();

  const origin = new URL(startUrl).origin;
  const surname = accountName ? accountName.charAt(0) : undefined;
  onLog?.(createLog("info", `최신 리뷰부터 수정 버튼 클릭 탐색 시작${surname ? ` (성씨: ${surname})` : ""}`));

  await delay(900);
  const matchedByRecentScope = await findEditUrlFromRecentProductPages(page, onLog, 6, surname);
  if (matchedByRecentScope) return matchedByRecentScope;

  const currentEditLinks = await collectCandidateEditUrls(page);
  for (const editUrl of currentEditLinks) {
    onLog?.(createLog("info", `리뷰영역 수정 링크 시도: ${editUrl}`));
    const clicked = await clickModifyLinkByAbsoluteUrl(page, editUrl);
    if (!clicked) continue;
    await delay(1200);
    if (await canEditCurrentPage(page)) return editUrl;
  }

  const currentDetailLinks = await collectCandidateDetailUrls(page);
  for (const detailUrl of currentDetailLinks) {
    await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
    await delay(1000);
    const editUrl = await findFirstHrefBySelectors(page, REVIEW_EDIT_LINK_SELECTORS);
    if (editUrl) {
      onLog?.(createLog("info", `상세에서 리뷰 수정 페이지 이동 시도: ${editUrl}`));
      await page.goto(editUrl, { waitUntil: "domcontentloaded" });
      await delay(1200);
      if (await canEditCurrentPage(page)) return editUrl;
    }
  }

  for (const pathName of REVIEW_LIST_PATHS) {
    const reviewListUrl = `${origin}${pathName}`;
    onLog?.(createLog("info", `리뷰 페이지 이동: ${reviewListUrl}`));
    await page.goto(reviewListUrl, { waitUntil: "domcontentloaded" });
    await delay(1500);

    const editLinks = await collectCandidateEditUrls(page);
    for (const editUrl of editLinks) {
      onLog?.(createLog("info", `내 리뷰 수정 페이지 이동 시도: ${editUrl}`));
      await page.goto(editUrl, { waitUntil: "domcontentloaded" });
      await delay(1200);
      if (await canEditCurrentPage(page)) return editUrl;
    }

    const detailUrl = await findFirstHrefBySelectors(page, REVIEW_DETAIL_LINK_SELECTORS);
    if (detailUrl) {
      await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
      await delay(1000);
      const editUrl = await findFirstHrefBySelectors(page, REVIEW_EDIT_LINK_SELECTORS);
      if (editUrl) {
        await page.goto(editUrl, { waitUntil: "domcontentloaded" });
        await delay(1200);
        if (await canEditCurrentPage(page)) return editUrl;
      }
    }
  }

  return null;
};

const buildClipboardImagePayloads = (imagePaths: string[]): ClipboardImagePayload[] => {
  return imagePaths.map((imagePath) => ({
    name: path.basename(imagePath),
    mimeType: getMimeTypeFromPath(imagePath),
    base64: fs.readFileSync(imagePath).toString("base64"),
  }));
};

const getEditorImageCount = async (page: Page): Promise<number> => {
  return page.evaluate(() => {
    const instance = (window as any).EC_FROALA_INSTANCE;
    if (instance?.el) {
      return instance.el.querySelectorAll("img").length;
    }

    const iframe = document.querySelector("#content_IFRAME") as HTMLIFrameElement | null;
    if (iframe?.contentDocument) {
      return iframe.contentDocument.querySelectorAll("img").length;
    }

    return 0;
  });
};

const focusReviewEditor = async (page: Page): Promise<boolean> => {
  const iframeHandle = await page.$("#content_IFRAME");
  const iframe = await iframeHandle?.contentFrame();
  if (iframe) {
    try {
      await iframe.click("body");
      return true;
    } catch {
      // continue
    }
  }

  const editor = await page.$(".fr-element.fr-view, .fr-element");
  if (!editor) return false;

  try {
    await editor.click();
    return true;
  } catch {
    return false;
  }
};

const writeClipboardImage = async (page: Page, payload: ClipboardImagePayload): Promise<boolean> => {
  try {
    const origin = new URL(page.url()).origin;
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  } catch {
    // continue without explicit permission grant
  }

  try {
    return await page.evaluate(async (image) => {
      if (!navigator.clipboard?.write) return false;
      if (typeof ClipboardItem === "undefined") return false;

      const binary = atob(image.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: image.mimeType });
      const item = new ClipboardItem({ [image.mimeType]: blob });
      await navigator.clipboard.write([item]);
      return true;
    }, payload);
  } catch {
    return false;
  }
};

const copyImageToSystemClipboard = (imagePath: string): boolean => {
  if (process.platform !== "darwin") return false;

  const ext = path.extname(imagePath).toLowerCase();
  const needsTranscode = ext === ".webp" || ext === ".gif";
  const tempPath = needsTranscode
    ? path.join(
        os.tmpdir(),
        `hanryeo-clipboard-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.png`,
      )
    : null;
  const sourcePath = tempPath ?? imagePath;

  try {
    if (tempPath) {
      execFileSync("ffmpeg", ["-y", "-i", imagePath, "-frames:v", "1", tempPath], { stdio: "ignore" });
    }

    const escaped = sourcePath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `set the clipboard to (read (POSIX file "${escaped}") as picture)`;
    execFileSync("osascript", ["-e", script], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  } finally {
    if (tempPath) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
  }
};

const waitForEditorImageCount = async (page: Page, targetCount: number, timeoutMs = 8000): Promise<number> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await getEditorImageCount(page);
    if (current >= targetCount) return current;
    await delay(500);
  }
  return await getEditorImageCount(page);
};

const uploadImageToEditor = async (page: Page, imagePaths: string[], onLog?: OnLog): Promise<boolean> => {
  if (imagePaths.length === 0) return false;

  const payloads = buildClipboardImagePayloads(imagePaths);
  const beforeImageCount = await getEditorImageCount(page);
  let successCount = 0;

  for (let i = 0; i < payloads.length; i += 1) {
    const payload = payloads[i];
    const currentBefore = await getEditorImageCount(page);
    const tag = `이미지 ${i + 1}/${payloads.length}`;

    const tryFroalaUpload = async (): Promise<boolean> => {
      const uploaded = await page.evaluate(async (img) => {
        const instance = (window as any).EC_FROALA_INSTANCE;
        if (!instance) return false;
        const binary = atob(img.base64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const file = new File([bytes], img.name, { type: img.mimeType });
        try {
          if (instance.image?.upload) {
            instance.image.upload([file]);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }, payload);
      if (!uploaded) return false;
      const after = await waitForEditorImageCount(page, currentBefore + 1, 15000);
      return after > currentBefore;
    };

    const trySyntheticPaste = async (): Promise<boolean> => {
      await page.evaluate(async (img) => {
        const instance = (window as any).EC_FROALA_INSTANCE;
        const editor = instance?.el as HTMLElement;
        if (!editor) return;
        const binary = atob(img.base64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        const file = new File([bytes], img.name, { type: img.mimeType });
        const dt = new DataTransfer();
        dt.items.add(file);
        const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: dt });
        editor.focus();
        editor.dispatchEvent(event);
      }, payload);
      const after = await waitForEditorImageCount(page, currentBefore + 1, 15000);
      return after > currentBefore;
    };

    const tryClipboardKeyboard = async (): Promise<boolean> => {
      try {
        const origin = new URL(page.url()).origin;
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
      } catch { /* ignore */ }
      await writeClipboardImage(page, payload);
      copyImageToSystemClipboard(imagePaths[i]);
      await delay(500);
      await focusReviewEditor(page);
      await delay(300);
      const pasteKey = process.platform === "darwin" ? "Meta+V" : "Control+V";
      await page.keyboard.press(pasteKey);
      const after = await waitForEditorImageCount(page, currentBefore + 1, 12000);
      return after > currentBefore;
    };

    let uploaded = false;
    try {
      onLog?.(createLog("info", `${tag} Froala API 업로드 시도`));
      uploaded = await tryFroalaUpload();
      if (!uploaded) {
        onLog?.(createLog("info", `${tag} 합성 이벤트 시도`));
        uploaded = await trySyntheticPaste();
      }
      if (!uploaded) {
        onLog?.(createLog("info", `${tag} 클립보드 키보드 시도`));
        uploaded = await tryClipboardKeyboard();
      }

      if (uploaded) {
        successCount += 1;
        onLog?.(createLog("info", `${tag} 업로드 성공`));
      } else {
        onLog?.(createLog("warn", `${tag} 업로드 실패`));
      }
      await delay(3000);
    } catch {
      onLog?.(createLog("warn", `${tag} 에러 발생`));
      continue;
    }
  }

  await delay(1500);
  const afterImageCount = await getEditorImageCount(page);
  const added = afterImageCount - beforeImageCount;
  if (added > 0) {
    onLog?.(createLog("success", `이미지 업로드 완료: ${added}장`));
    return true;
  }

  onLog?.(createLog("warn", `이미지 업로드 실패: 0장 (시도 ${payloads.length}장)`));
  return false;
};

const findReviewImageInput = async (context: Page | Frame): Promise<ElementHandle<HTMLInputElement> | null> => {
  const exactSelectors = [
    "form#boardWriteForm input[type='file'][name*='image' i]",
    "form#boardWriteForm input[type='file']",
    "input[type='file'][name*='image' i][accept*='image' i]",
    "input[type='file'][name*='photo' i][accept*='image' i]",
    "input[type='file'][accept*='image' i]",
    "input[type='file'][multiple][accept*='image' i]",
  ];

  for (const selector of exactSelectors) {
    const matched = await context.$(selector);
    if (matched) {
      return matched as ElementHandle<HTMLInputElement>;
    }
  }

  const allFileInputs = await context.$$("input[type='file']");
  for (const input of allFileInputs) {
    const info = await input.evaluate((element) => {
      const inputElement = element as HTMLInputElement;
      const form = inputElement.closest("form");
      return {
        accept: inputElement.accept.toLowerCase(),
        disabled: inputElement.disabled,
        id: (inputElement.id || "").toLowerCase(),
        name: (inputElement.name || "").toLowerCase(),
        className: inputElement.className.toLowerCase(),
        formId: (form?.id || "").toLowerCase(),
        formName: (form?.getAttribute("name") || "").toLowerCase(),
      };
    });

    const hasImageHint =
      info.accept.includes("image") ||
      /(review|photo|image|upload|attach|board)/i.test(
        [info.id, info.name, info.className, info.formId, info.formName].join(""),
      );

    if (!info.disabled && hasImageHint) {
      return input as ElementHandle<HTMLInputElement>;
    }
  }

  return allFileInputs[0] as ElementHandle<HTMLInputElement> | null;
};

const uploadReviewImagesByInput = async (page: Page, imagePaths: string[], onLog?: OnLog): Promise<boolean> => {
  const candidateFrames = page.frames();

  for (const frame of candidateFrames) {
    try {
      const fileInput = await findReviewImageInput(frame);
      if (!fileInput) continue;

      await fileInput.setInputFiles(imagePaths);
      onLog?.(createLog("success", `파일 업로드 폴백 완료: ${imagePaths.length}장`));
      await delay(2000);
      return true;
    } catch {
      continue;
    }
  }

  return false;
};

const syncEditorToTextarea = async (page: Page): Promise<void> => {
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
};

export const writeReviewAction = async (
  page: Page,
  params: Partial<WriteReviewParams>,
  onLog?: OnLog,
): Promise<ActionResult> => {
  const {
    accountId,
    accountName,
    title,
    content,
    enableImageUpload = true,
    forceImageUpload = false,
    imageRootDirectories = IMAGE_ROOTS,
    imageOnly = false,
    explicitImagePaths,
  } = {
    ...DEFAULT_REVIEW,
    ...params,
  };

  try {
    page.on("dialog", async (dialog) => {
      onLog?.(createLog("info", `[팝업] ${dialog.type()}: ${dialog.message()}`));
      await dialog.accept();
    });

    const editUrl = await resolveReviewEditUrl(page, accountId, onLog, accountName);
    if (!editUrl) {
      throw new Error("수정할 내 리뷰를 찾지 못함");
    }
    onLog?.(createLog("success", "리뷰 수정 페이지 도달"));

    await page.waitForSelector("#content_IFRAME", { timeout: 10000 });
    await delay(1500);

    if (!imageOnly) {
      onLog?.(createLog("info", `제목 수정: ${title}`));
      await page.fill("#subject", title);
      await delay(300);

      onLog?.(createLog("info", "본문 수정"));
      await page.evaluate((text) => {
        const instance = (window as any).EC_FROALA_INSTANCE;
        if (instance && instance.el) {
          const html = text
            .split("\n\n")
            .map((paragraph: string) => `<p>${paragraph}</p>`)
            .join("");
          instance.el.innerHTML = instance.clean.html(html);
          instance.undo.saveStep();
        }
      }, content);
      await delay(500);
      await syncEditorToTextarea(page);
      onLog?.(createLog("success", "본문 수정 완료"));
    }

    const willUploadImage = imageOnly || forceImageUpload || (enableImageUpload && shouldUploadImage());
    if (willUploadImage) {
      const imagePaths = explicitImagePaths ?? pickRandomImages(imageRootDirectories);
      logSelectedImages(imagePaths, onLog);

      if (imagePaths.length > 0) {
        const pasted = await uploadImageToEditor(page, imagePaths, onLog);
        if (!pasted) {
          const uploaded = await uploadReviewImagesByInput(page, imagePaths, onLog);
          if (!uploaded) {
            onLog?.(createLog("warn", "이미지 업로드에 실패해 텍스트만 수정 진행"));
          }
        }
      }

      await syncEditorToTextarea(page);
      onLog?.(createLog("success", "이미지/본문 동기화 완료"));
    }

    onLog?.(createLog("info", "수정 완료 버튼 클릭"));
    await syncEditorToTextarea(page);
    await delay(500);

    const submitted = await page.evaluate(() => {
      try {
        (window as any).BOARD_WRITE.form_submit("boardWriteForm");
        return true;
      } catch {
        const btn = document.querySelector("a.btnSubmit, .btnArea a.btnStrong, a[onclick*='form_submit'], input[type='submit'], button[type='submit']") as HTMLElement;
        if (btn) { btn.click(); return true; }
        const form = document.getElementById("boardWriteForm") as HTMLFormElement;
        if (form) { form.submit(); return true; }
        return false;
      }
    });

    if (!submitted) {
      onLog?.(createLog("warn", "수정 완료 버튼 클릭 실패"));
    }
    await delay(7000);

    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes("/board/product/modify.html");
    if (!isSuccess) {
      throw new Error("리뷰 수정 실패 - 수정 페이지에서 벗어나지 못함");
    }

    const parsedEdit = parseReviewIdentifiers(editUrl);
    const parsedFinal = parseReviewIdentifiers(currentUrl);
    const reviewNo = parsedEdit.reviewNo ?? parsedFinal.reviewNo;
    const boardNo = parsedEdit.boardNo ?? parsedFinal.boardNo;
    const productNo = parsedEdit.productNo ?? parsedFinal.productNo;
    if (accountId && reviewNo && boardNo) {
      upsertReviewRef(accountId, {
        reviewNo,
        boardNo,
        productNo,
        reviewTitle: imageOnly ? (title || "") : title,
        editUrl,
      });
      onLog?.(createLog("success", `리뷰 인덱스 저장 완료: board=${boardNo}, no=${reviewNo}`));
    }

    onLog?.(createLog("success", `리뷰 수정 완료: ${currentUrl}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `리뷰 수정 실패: ${message}`));
    return { success: false, error: message };
  }
};
