import type { Page, Browser, BrowserContext } from "playwright";

export type LogLevel = "info" | "success" | "error" | "warn";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type OnLog = (log: LogEntry) => void;

export const createLog = (level: LogLevel, message: string): LogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  message,
});

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PipelineStep {
  name: string;
  execute: (page: Page, onLog: OnLog) => Promise<ActionResult>;
}
