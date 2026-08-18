"use client";

import React from "react";
import { Input } from "@/shared/ui/Input";
import { AccountSelector } from "./AccountSelector";
import type { PipelineRequirements } from "@/features/pipeline/lib/pipeline-config";
import type { StoredAccount } from "@/features/pipeline/hooks/useAccounts";

interface PipelineSettingsProps {
  requirements: PipelineRequirements;
  baseUrl: string;
  count: number;
  productUrl: string;
  allAccounts: StoredAccount[];
  filteredAccounts: StoredAccount[];
  batchCount: number;
  filterLabel: string;
  disabled: boolean;
  hasSteps: boolean;
  onBaseUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProductUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBatchCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PipelineSettings = ({
  requirements,
  baseUrl,
  count,
  productUrl,
  allAccounts,
  filteredAccounts,
  batchCount,
  filterLabel,
  disabled,
  hasSteps,
  onBaseUrlChange,
  onCountChange,
  onProductUrlChange,
  onBatchCountChange,
}: PipelineSettingsProps) => {
  const hasAnyField = requirements.needsBaseUrl || requirements.needsLogin || requirements.needsProduct || requirements.needsCount;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-200">설정</h2>

      {!hasSteps && (
        <p className="text-xs text-zinc-600 py-2">
          단계를 선택하면 설정이 표시됩니다
        </p>
      )}

      {hasSteps && !hasAnyField && (
        <p className="text-xs text-zinc-500 py-2">
          추가 설정이 필요 없는 단계입니다
        </p>
      )}

      {requirements.needsBaseUrl && (
        <Input
          id="baseUrl"
          label="쇼핑몰 URL"
          value={baseUrl}
          onChange={onBaseUrlChange}
          disabled={disabled}
        />
      )}

      {requirements.needsCount && (
        <Input
          id="count"
          label="반복 횟수"
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={onCountChange}
          disabled={disabled}
        />
      )}

      {requirements.needsLogin && (
        <AccountSelector
          allAccounts={allAccounts}
          filteredAccounts={filteredAccounts}
          batchCount={batchCount}
          disabled={disabled}
          filterLabel={filterLabel}
          onBatchCountChange={onBatchCountChange}
        />
      )}

      {requirements.needsProduct && (
        <Input
          id="productUrl"
          label="제품 URL"
          value={productUrl}
          onChange={onProductUrlChange}
          disabled={disabled}
        />
      )}
    </div>
  );
};
