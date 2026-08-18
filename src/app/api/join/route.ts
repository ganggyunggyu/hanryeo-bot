import { NextRequest } from "next/server";
import { runJoinAutomation } from "@/features/join/lib/join-automation";
import { saveAccount } from "@/features/join/lib/account-storage";
import type { JoinLogEntry, JoinAccount, SSEMessage } from "@/types/join";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const baseUrl = searchParams.get("baseUrl") ?? "https://hanryeodamwon.com";
  const count = parseInt(searchParams.get("count") ?? "1", 10);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (message: SSEMessage) => {
        const data = `data: ${JSON.stringify(message)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const handleLog = (log: JoinLogEntry) => {
        send({ type: "log", data: log });
      };

      const handleAccount = (account: JoinAccount) => {
        if (account.status === "success") {
          saveAccount(account);
        }
        send({ type: "account", data: account });
      };

      runJoinAutomation(baseUrl, count, handleLog, handleAccount)
        .then(() => {
          send({ type: "done", data: { message: "모든 작업 완료" } });
          controller.close();
        })
        .catch((err) => {
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
