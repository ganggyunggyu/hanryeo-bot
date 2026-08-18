import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";
import { generateAccount } from "@/features/join/lib/data-generator";
import type { JoinAccount } from "@/types/join";

export const joinFormAction = async (
  page: Page,
  _params: Record<string, never>,
  onLog?: OnLog
): Promise<ActionResult<JoinAccount>> => {
  try {
    const { id, password, name, email, gender, phone } = generateAccount();

    onLog?.(createLog("info", `아이디 입력: ${id}`));
    await page.fill("#member_id", id);
    await delay(300);

    onLog?.(createLog("info", "비밀번호 입력"));
    await page.fill("#passwd", password);
    await delay(200);
    await page.fill("#user_passwd_confirm", password);
    await delay(200);

    onLog?.(createLog("info", `이름 입력: ${name}`));
    await page.fill("#name", name);
    await delay(200);

    onLog?.(createLog("info", `휴대폰 입력: 010-${phone.mobile2}-${phone.mobile3}`));
    await page.selectOption("#mobile1", phone.mobile1);
    await delay(100);
    await page.fill("#mobile2", phone.mobile2);
    await delay(100);
    await page.fill("#mobile3", phone.mobile3);
    await delay(200);

    onLog?.(createLog("info", `이메일 입력: ${email}`));
    await page.fill("#email1", email);
    await delay(300);

    onLog?.(createLog("info", "'가입하기' 버튼 클릭"));
    await page.evaluate(() => {
      const fn = (window as unknown as Record<string, unknown>)
        .memberJoinAction as (() => void) | undefined;
      if (fn) fn();
    });
    await delay(2000);

    const confirmBtn = await page.$(
      "#ec_shop_confirm-checkingjoininfo_action"
    );
    if (confirmBtn) {
      onLog?.(createLog("info", "확인 레이어 클릭"));
      await confirmBtn.click();
      await delay(3000);
    }

    const currentUrl = page.url();
    const isSuccess =
      currentUrl.includes("join_result") ||
      currentUrl.includes("returnUrl") ||
      currentUrl === "https://hanryeodamwon.com/";

    if (!isSuccess) {
      onLog?.(createLog("error", "가입 폼 제출 실패"));
      return { success: false, error: "가입 폼 제출 후 결과 페이지 미도달" };
    }

    const account: JoinAccount = {
      id,
      password,
      name,
      email,
      phone: `010-${phone.mobile2}-${phone.mobile3}`,
      gender,
      status: "success",
      createdAt: new Date().toISOString(),
    };

    onLog?.(createLog("success", `회원가입 완료: ${name} (${id})`));
    return { success: true, data: account };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `가입 폼 에러: ${message}`));
    return { success: false, error: message };
  }
};
