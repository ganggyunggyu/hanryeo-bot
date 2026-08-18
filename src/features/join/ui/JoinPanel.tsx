"use client";

import React from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { cn } from "@/shared/lib/cn";

interface JoinPanelProps {
  baseUrl: string;
  count: number;
  isRunning: boolean;
  onBaseUrlChange: (url: string) => void;
  onCountChange: (count: number) => void;
  onStart: () => void;
  onStop: () => void;
}

export const JoinPanel = ({
  baseUrl,
  count,
  isRunning,
  onBaseUrlChange,
  onCountChange,
  onStart,
  onStop,
}: JoinPanelProps) => {
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBaseUrlChange(e.target.value);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) onCountChange(val);
  };

  const handleStart = () => {
    onStart();
  };

  const handleStop = () => {
    onStop();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900 p-5",
        "flex flex-col gap-4"
      )}
    >
      <h2 className="text-base font-semibold text-zinc-200">가입 설정</h2>
      <Input
        id="baseUrl"
        label="쇼핑몰 URL"
        value={baseUrl}
        onChange={handleUrlChange}
        placeholder="https://hanryeodamwon.com"
        disabled={isRunning}
      />
      <Input
        id="count"
        label="가입 수량"
        type="number"
        min={1}
        max={100}
        value={count}
        onChange={handleCountChange}
        disabled={isRunning}
      />
      <div className="flex gap-3 pt-2">
        {!isRunning ? (
          <Button variant="primary" onClick={handleStart}>
            가입 시작
          </Button>
        ) : (
          <Button variant="danger" onClick={handleStop}>
            중지
          </Button>
        )}
      </div>
    </div>
  );
};
