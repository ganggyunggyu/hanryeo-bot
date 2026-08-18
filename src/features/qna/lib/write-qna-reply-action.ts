import type { Page } from "playwright";
import type { ActionResult, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { delay } from "@/shared/lib/random";

interface WriteQnaReplyParams {
  detailUrl: string;
  replyText: string;
  commentName: string;
  commentPassword: string;
}

export const writeQnaReplyAction = async (
  page: Page,
  { detailUrl, replyText, commentName, commentPassword }: WriteQnaReplyParams,
  onLog?: OnLog,
): Promise<ActionResult> => {
  try {
    page.on("dialog", async (dialog) => {
      onLog?.(createLog("info", `[팝업] ${dialog.type()}: ${dialog.message()}`));
      await dialog.accept();
    });

    onLog?.(createLog("info", `QNA 상세 페이지 이동`));
    await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
    await delay(3000);

    const hasCommentForm = await page.evaluate(() => {
      const textarea = document.querySelector("#comment") as HTMLTextAreaElement;
      return textarea && textarea.offsetParent !== null;
    });

    if (!hasCommentForm) {
      throw new Error("댓글 작성 폼을 찾을 수 없음");
    }

    const writeForm = "#commentWriteForm";

    onLog?.(createLog("info", `댓글 내용 입력 (${replyText.substring(0, 30)}...)`));
    await page.fill(`${writeForm} #comment`, replyText);
    await delay(300);

    onLog?.(createLog("info", `이름 입력: ${commentName}`));
    await page.fill(`${writeForm} #comment_name`, commentName);
    await delay(200);

    onLog?.(createLog("info", "비밀번호 입력"));
    await page.fill(`${writeForm} #comment_password`, commentPassword);
    await delay(200);

    onLog?.(createLog("info", "등록 버튼 클릭"));
    await page.evaluate(() => {
      (window as any).BOARD_COMMENT.comment_insert("/exec/front/Board/CommentWrite/6");
    });
    await delay(5000);

    const commentExists = await page.evaluate(() => {
      const comments = document.querySelectorAll("ul.boardComment li");
      return comments.length > 0;
    });

    if (!commentExists) {
      throw new Error("댓글 등록 확인 실패 - 댓글이 보이지 않음");
    }

    onLog?.(createLog("success", "QNA 답변 등록 완료"));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onLog?.(createLog("error", `QNA 답변 실패: ${message}`));
    return { success: false, error: message };
  }
};
