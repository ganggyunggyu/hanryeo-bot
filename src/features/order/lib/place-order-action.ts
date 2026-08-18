import type { Page, Frame } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

interface PlaceOrderParams {
  depositorName: string;
  address: string;
  detailAddress?: string;
}

const findKakaoFrame = async (page: Page, onLog?: OnLog): Promise<Frame | null> => {
  for (let i = 0; i < 15; i++) {
    const frames = page.frames();
    const kakao = frames.find((f) => f.url().includes("postcode.map.daum.net"));
    if (kakao) return kakao;
    onLog?.(createLog("info", `카카오 postcode frame 대기 중... (${i + 1}/15)`));
    await delay(1000);
  }
  return null;
};

const fillAddress = async (page: Page, address: string, detailAddress: string, onLog?: OnLog) => {
  onLog?.(createLog("info", "주소검색 버튼 클릭"));
  await page.click("#btn_search_rzipcode");
  await delay(2000);

  onLog?.(createLog("info", "카카오 postcode iframe 탐색"));
  const kakaoFrame = await findKakaoFrame(page, onLog);
  if (!kakaoFrame) {
    const frameUrls = page.frames().map((f) => f.url());
    onLog?.(createLog("error", `프레임 목록: ${frameUrls.join(", ")}`));
    throw new Error("카카오 postcode iframe을 찾을 수 없음");
  }
  onLog?.(createLog("success", "카카오 postcode frame 발견"));

  onLog?.(createLog("info", `주소 검색: ${address}`));
  const searchInput = await kakaoFrame.waitForSelector(
    "input#region_name, input.txt_search, input[type=text]",
    { timeout: 10000 }
  );
  await searchInput.click({ force: true });
  await searchInput.fill(address);
  await delay(500);
  await searchInput.press("Enter");
  await delay(3000);

  onLog?.(createLog("info", "검색 결과에서 주소 선택"));
  const addrResult = await kakaoFrame.$("span.txt_address button.link_post");
  if (addrResult) {
    await addrResult.click();
  } else {
    const altResult = await kakaoFrame.$("li button.link_post, .list_post button");
    if (altResult) {
      await altResult.click();
    } else {
      throw new Error("주소 검색 결과 없음");
    }
  }
  await delay(3000);

  const addr2El = await page.$("#raddr2");
  if (addr2El && await addr2El.isVisible()) {
    await addr2El.fill(detailAddress);
    onLog?.(createLog("info", `상세주소 입력: ${detailAddress}`));
  }
  await delay(500);

  onLog?.(createLog("success", "주소 입력 완료"));
};

const selectBank = async (page: Page, onLog?: OnLog) => {
  onLog?.(createLog("info", "무통장 입금 은행 선택"));

  const options = await page.$$eval("#bankaccount option", (opts) =>
    opts.map((o) => ({ value: (o as HTMLOptionElement).value, text: o.textContent?.trim() ?? "" }))
  );

  const bankOption =
    options.find((o) => o.value !== "-1" && o.text.includes("기업은행")) ??
    options.find((o) => o.value !== "-1");

  if (!bankOption) {
    throw new Error("선택 가능한 은행 옵션 없음");
  }

  await page.selectOption("#bankaccount", bankOption.value);
  onLog?.(createLog("success", `은행 선택: ${bankOption.text}`));
};

const fillDepositorName = async (page: Page, name: string, onLog?: OnLog) => {
  onLog?.(createLog("info", `입금자명 입력: ${name}`));
  await page.fill("#pname", name);
  await delay(200);
};

const clickPayment = async (page: Page, onLog?: OnLog) => {
  onLog?.(createLog("info", "결제하기 버튼 클릭 (중복방지)"));
  await page.evaluate(() => {
    const btn = document.querySelector("#btn_payment") as HTMLElement;
    if (!btn) return;
    btn.click();
    btn.style.pointerEvents = "none";
    btn.setAttribute("disabled", "true");
  });
  await delay(8000);
};

export const placeOrderAction = async (
  page: Page,
  { depositorName, address, detailAddress = "1층" }: PlaceOrderParams,
  onLog?: OnLog
): Promise<ActionResult> => {
  try {
    await fillAddress(page, address, detailAddress, onLog);
    await selectBank(page, onLog);
    await fillDepositorName(page, depositorName, onLog);
    await clickPayment(page, onLog);

    const currentUrl = page.url();
    onLog?.(createLog("success", `주문 완료 페이지: ${currentUrl}`));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `주문 실패: ${message}`));
    return { success: false, error: message };
  }
};
