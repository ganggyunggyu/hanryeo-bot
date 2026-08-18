"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import type { LogEntry } from "@/types/automation";

interface LogViewerProps {
  logs: LogEntry[];
}

const LOG_COLORS: Record<LogEntry["level"], string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  error: "text-red-400",
  warn: "text-amber-400",
};

export const LogViewer = ({ logs }: LogViewerProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900",
        "flex flex-col h-[400px]"
      )}
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">실행 로그</h2>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 && (
          <p className="text-zinc-600">로그가 없습니다.</p>
        )}
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="shrink-0 text-zinc-600">{formatTime(log.timestamp)}</span>
            <span className={cn("shrink-0 w-12 uppercase", LOG_COLORS[log.level])}>
              [{log.level}]
            </span>
            <span className={LOG_COLORS[log.level]}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
