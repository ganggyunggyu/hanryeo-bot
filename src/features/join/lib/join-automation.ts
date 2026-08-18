import type { OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";
import { startSession, endSession } from "@/features/browser/lib/browser-manager";
import { agreeAction } from "@/features/join/lib/agree-action";
import { joinFormAction } from "@/features/join/lib/join-form-action";
import { delay } from "@/shared/lib/random";
import type { JoinAccount, JoinLogEntry } from "@/types/join";

type LogCallback = (log: JoinLogEntry) => void;
type AccountCallback = (account: JoinAccount) => void;

export const runJoinAutomation = async (
  baseUrl: string,
  count: number,
  onLog: LogCallback,
  onAccount: AccountCallback
) => {
  const wrappedLog: OnLog = (log) => onLog(log as JoinLogEntry);

  const session = await startSession(wrappedLog);

  try {
    for (let i = 0; i < count; i++) {
      const page = await session.context.newPage();
      onLog(createLog("info", `--- [${i + 1}/${count}] 가입 시작 ---`) as JoinLogEntry);

      try {
        const agreeResult = await agreeAction(page, { baseUrl }, wrappedLog);
        if (!agreeResult.success) throw new Error(agreeResult.error);

        const joinResult = await joinFormAction(page, {} as Record<string, never>, wrappedLog);
        if (!joinResult.success) throw new Error(joinResult.error);

        onAccount(joinResult.data!);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onLog(createLog("error", `[${i + 1}/${count}] 실패: ${message}`) as JoinLogEntry);
        onAccount({
          id: "-",
          password: "-",
          name: "-",
          email: "-",
          gender: "male",
          status: "failed",
          message,
          createdAt: new Date().toISOString(),
        });
      } finally {
        await page.close();
      }

      if (i < count - 1) {
        onLog(createLog("info", "다음 계정 대기 (2초)...") as JoinLogEntry);
        await delay(2000);
      }
    }
  } finally {
    await endSession(session, wrappedLog);
  }
};
