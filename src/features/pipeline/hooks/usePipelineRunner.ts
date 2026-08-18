"use client";

import React from "react";
import type { LogEntry } from "@/types/automation";
import type { JoinAccount } from "@/types/join";
import type { StepId } from "@/features/pipeline/lib/step-metadata";
import type { StoredAccount } from "./useAccounts";

interface RunParams {
  steps: StepId[];
  baseUrl: string;
  count: number;
  productUrl?: string;
  accountId?: string;
  accountPassword?: string;
  accountName?: string;
}

type BatchParams = Omit<RunParams, "accountId" | "accountPassword" | "accountName">;

export const usePipelineRunner = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [newAccounts, setNewAccounts] = React.useState<JoinAccount[]>([]);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const abortRef = React.useRef<AbortController | null>(null);

  const appendLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), level, message }]);
  };

  const streamPipeline = async (params: RunParams, signal: AbortSignal) => {
    const response = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const dataLine = line.replace(/^data: /, "");
        if (!dataLine.trim()) continue;

        try {
          const message = JSON.parse(dataLine);

          if (message.type === "log") {
            setLogs((prev) => [...prev, message.data as LogEntry]);
          } else if (message.type === "account") {
            setNewAccounts((prev) => [...prev, message.data as JoinAccount]);
          } else if (message.type === "done" || message.type === "error") {
            const { message: msg } = message.data as { message: string };
            appendLog(message.type === "done" ? "success" : "error", msg);
          }
        } catch {
          // skip
        }
      }
    }
  };

  const execute = async (params: RunParams) => {
    setIsRunning(true);
    setLogs([]);
    setProgress({ current: 0, total: 0 });
    if (params.steps.includes("join")) setNewAccounts([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamPipeline(params, controller.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        appendLog("warn", "사용자에 의해 중지됨");
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const executeBatch = async (targetAccounts: StoredAccount[], params: BatchParams) => {
    setIsRunning(true);
    setLogs([]);
    setNewAccounts([]);
    setProgress({ current: 0, total: targetAccounts.length });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for (let i = 0; i < targetAccounts.length; i++) {
        if (controller.signal.aborted) break;

        const account = targetAccounts[i];
        setProgress({ current: i + 1, total: targetAccounts.length });
        appendLog("info", `━━━ [${i + 1}/${targetAccounts.length}] ${account.name} (${account.id}) ━━━`);

        await streamPipeline(
          {
            ...params,
            accountId: account.id,
            accountPassword: account.password,
            accountName: account.name,
          },
          controller.signal
        );
      }

      appendLog("success", `배치 완료: ${targetAccounts.length}개 계정 처리됨`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        appendLog("warn", "사용자에 의해 중지됨");
      }
    } finally {
      setIsRunning(false);
      setProgress({ current: 0, total: 0 });
      abortRef.current = null;
    }
  };

  const abort = () => {
    abortRef.current?.abort();
  };

  return { isRunning, logs, newAccounts, progress, execute, executeBatch, abort };
};
