"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/Input";
import type { StoredAccount } from "@/features/pipeline/hooks/useAccounts";

interface AccountSelectorProps {
  allAccounts: StoredAccount[];
  filteredAccounts: StoredAccount[];
  batchCount: number;
  disabled: boolean;
  filterLabel: string;
  onBatchCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AccountSelector = ({
  allAccounts,
  filteredAccounts,
  batchCount,
  disabled,
  filterLabel,
  onBatchCountChange,
}: AccountSelectorProps) => {
  const targetAccounts = filteredAccounts.slice(0, batchCount);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">계정 배치</span>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-500">전체 {allAccounts.length}개</span>
          <span className="text-zinc-600">/</span>
          <span className="text-emerald-400">{filterLabel} {filteredAccounts.length}개</span>
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="py-3 px-3 rounded-lg bg-zinc-800/50 text-xs text-zinc-500 text-center">
          실행 가능한 계정이 없습니다
        </div>
      ) : (
        <React.Fragment>
          <Input
            id="batchCount"
            label="실행할 계정 수"
            type="number"
            min={1}
            max={filteredAccounts.length}
            value={batchCount}
            onChange={onBatchCountChange}
            disabled={disabled}
          />

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-500">
              대상 계정 ({targetAccounts.length}개)
            </span>
            <div className="max-h-35 overflow-y-auto rounded-lg bg-zinc-800/50 divide-y divide-zinc-800">
              {targetAccounts.map((a, idx) => (
                <div
                  key={a.id}
                  className={cn(
                    "px-3 py-1.5 flex items-center justify-between",
                    "text-xs text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 w-5 text-right">{idx + 1}</span>
                    <span className="text-zinc-200">{a.name}</span>
                    <span className="font-mono text-zinc-500">{a.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span>구매 {a.purchaseCount}</span>
                    <span>리뷰 {a.reviewCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
};
