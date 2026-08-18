import { NextRequest } from "next/server";
import { startSession, endSession } from "@/features/browser/lib/browser-manager";
import { agreeAction } from "@/features/join/lib/agree-action";
import { joinFormAction } from "@/features/join/lib/join-form-action";
import { saveAccount } from "@/features/join/lib/account-storage";
import { loginAction } from "@/features/auth/lib/login-action";
import { visitProductAction } from "@/features/product/lib/visit-product-action";
import { clickBuyAction } from "@/features/order/lib/click-buy-action";
import { placeOrderAction } from "@/features/order/lib/place-order-action";
import { writeReviewAction } from "@/features/review/lib/write-review-action";
import { delay } from "@/shared/lib/random";
import type { LogEntry, OnLog } from "@/types/automation";
import { createLog } from "@/types/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PipelineStep = "agree" | "join" | "login" | "visitProduct" | "clickBuy" | "placeOrder" | "writeReview";

interface PipelineRequest {
  steps: PipelineStep[];
  baseUrl: string;
  count: number;
  productUrl?: string;
  accountId?: string;
  accountPassword?: string;
  accountName?: string;
  reviewTitle?: string;
  reviewContent?: string;
}

interface SSEData {
  type: "log" | "account" | "done" | "error";
  data: LogEntry | Record<string, unknown> | { message: string };
}

export const POST = async (request: NextRequest) => {
  const body: PipelineRequest = await request.json();
  const { steps, baseUrl, count, productUrl, accountId, accountPassword, accountName, reviewTitle, reviewContent } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: SSEData) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };

      const onLog: OnLog = (log) => send({ type: "log", data: log });

      const run = async () => {
        const session = await startSession(onLog);

        try {
          for (let i = 0; i < count; i++) {
            const page = await session.context.newPage();
            onLog(createLog("info", `--- [${i + 1}/${count}] 파이프라인 시작 ---`));

            try {
              for (const step of steps) {
                switch (step) {
                  case "agree": {
                    const r = await agreeAction(page, { baseUrl }, onLog);
                    if (!r.success) throw new Error(r.error);
                    break;
                  }
                  case "join": {
                    const r = await joinFormAction(page, {} as Record<string, never>, onLog);
                    if (!r.success) throw new Error(r.error);
                    if (r.data) {
                      saveAccount(r.data);
                      send({ type: "account", data: r.data as unknown as Record<string, unknown> });
                    }
                    break;
                  }
                  case "login": {
                    if (!accountId || !accountPassword) throw new Error("로그인 정보 없음");
                    const r = await loginAction(page, { baseUrl, id: accountId, password: accountPassword }, onLog);
                    if (!r.success) throw new Error(r.error);
                    break;
                  }
                  case "visitProduct": {
                    if (!productUrl) throw new Error("제품 URL 없음");
                    const r = await visitProductAction(page, { productUrl }, onLog);
                    if (!r.success) throw new Error(r.error);
                    break;
                  }
                  case "clickBuy": {
                    const r = await clickBuyAction(page, {} as Record<string, never>, onLog);
                    if (!r.success) throw new Error(r.error);
                    break;
                  }
                  case "placeOrder": {
                    if (!accountName) throw new Error("입금자명 없음");
                    const r = await placeOrderAction(
                      page,
                      { depositorName: accountName, address: "매산로116번길 23-4" },
                      onLog
                    );
                    if (!r.success) throw new Error(r.error);
                    if (accountId) {
                      const { incrementPurchaseCount } = await import("@/features/join/lib/account-storage");
                      incrementPurchaseCount(accountId);
                    }
                    break;
                  }
                  case "writeReview": {
                    const r = await writeReviewAction(page, { accountId, title: reviewTitle, content: reviewContent }, onLog);
                    if (!r.success) throw new Error(r.error);
                    break;
                  }
                }
              }

              onLog(createLog("success", `[${i + 1}/${count}] 파이프라인 완료`));
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              onLog(createLog("error", `[${i + 1}/${count}] 실패: ${message}`));
            } finally {
              await page.close();
            }

            if (i < count - 1) {
              onLog(createLog("info", "다음 반복 대기 (2초)..."));
              await delay(2000);
            }
          }
        } finally {
          await endSession(session, onLog);
        }

        send({ type: "done", data: { message: "모든 파이프라인 완료" } });
        controller.close();
      };

      run().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", data: { message } });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
