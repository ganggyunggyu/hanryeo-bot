"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import { PageLayout } from "@/shared/ui/PageLayout";
import { Button } from "@/shared/ui/Button";
import { LogViewer } from "@/features/join/ui/JoinLogViewer";
import { AccountTable } from "@/features/join/ui/AccountTable";
import { PipelineBuilder } from "@/features/pipeline/ui/PipelineBuilder";
import { PipelineSettings } from "@/features/pipeline/ui/PipelineSettings";
import { usePipelineBuilder } from "@/features/pipeline/hooks/usePipelineBuilder";
import { usePipelineRunner } from "@/features/pipeline/hooks/usePipelineRunner";
import { useAccounts, filterAccountsBySteps } from "@/features/pipeline/hooks/useAccounts";

const DEFAULT_PRODUCT_URL =
  "https://hanryeodamwon.com/product/%ED%95%9C%EB%A0%A4%EB%8B%B4%EC%9B%90-%ED%9D%91%EC%97%BC%EC%86%8C-%EC%A7%84%EC%95%A1/9/category/30/display/1/#review";

const getFilterLabel = (steps: string[]): string => {
  const hasPurchase = steps.includes("placeOrder");
  const hasReview = steps.includes("writeReview");
  if (hasPurchase && hasReview) return "구매 미완료 + 리뷰 수정 가능";
  if (hasPurchase) return "구매 미완료";
  if (hasReview) return "리뷰 수정 가능";
  return "실행 가능";
};

const HomePage = () => {
  const [baseUrl, setBaseUrl] = React.useState("https://hanryeodamwon.com");
  const [count, setCount] = React.useState(1);
  const [productUrl, setProductUrl] = React.useState(DEFAULT_PRODUCT_URL);
  const [batchCount, setBatchCount] = React.useState(1);

  const builder = usePipelineBuilder();
  const runner = usePipelineRunner();
  const accounts = useAccounts();

  const filteredAccounts = React.useMemo(
    () => filterAccountsBySteps(accounts.list, builder.selectedSteps),
    [accounts.list, builder.selectedSteps]
  );

  const filterLabel = getFilterLabel(builder.selectedSteps);
  const isBatchMode = builder.requirements.needsLogin;
  const targetAccounts = filteredAccounts.slice(0, batchCount);

  const canRun =
    builder.selectedSteps.length > 0 &&
    (!isBatchMode || targetAccounts.length > 0);

  const handleStart = async () => {
    const baseParams = {
      steps: builder.selectedSteps,
      baseUrl,
      count: builder.requirements.needsCount ? count : 1,
      productUrl: builder.requirements.needsProduct ? productUrl : undefined,
    };

    if (isBatchMode) {
      await runner.executeBatch(targetAccounts, baseParams);
    } else {
      await runner.execute(baseParams);
    }
    await accounts.refresh();
  };

  const handleStop = () => {
    runner.abort();
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value);
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) setCount(val);
  };
  const handleProductUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => setProductUrl(e.target.value);
  const handleBatchCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0) setBatchCount(val);
  };

  return (
    <PageLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <PipelineBuilder
            selectedSteps={builder.selectedSteps}
            activePresetIndex={builder.activePresetIndex}
            disabled={runner.isRunning}
            onToggleStep={builder.toggleStep}
            onSelectPreset={builder.setFromPreset}
            onClear={builder.clearSteps}
          />

          <PipelineSettings
            requirements={builder.requirements}
            baseUrl={baseUrl}
            count={count}
            productUrl={productUrl}
            allAccounts={accounts.list}
            filteredAccounts={filteredAccounts}
            batchCount={batchCount}
            filterLabel={filterLabel}
            disabled={runner.isRunning}
            hasSteps={builder.selectedSteps.length > 0}
            onBaseUrlChange={handleBaseUrlChange}
            onCountChange={handleCountChange}
            onProductUrlChange={handleProductUrlChange}
            onBatchCountChange={handleBatchCountChange}
          />

          <div className="flex items-center gap-3">
            {!runner.isRunning ? (
              <Button variant="primary" onClick={handleStart} disabled={!canRun}>
                {isBatchMode ? `${targetAccounts.length}개 계정 실행` : "실행"}
              </Button>
            ) : (
              <React.Fragment>
                <Button variant="danger" onClick={handleStop}>
                  중지
                </Button>
                {runner.progress.total > 0 && (
                  <span className={cn("text-xs text-zinc-400")}>
                    {runner.progress.current}/{runner.progress.total} 진행 중
                  </span>
                )}
              </React.Fragment>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <LogViewer logs={runner.logs} />
          {runner.newAccounts.length > 0 && <AccountTable accounts={runner.newAccounts} />}
        </div>
      </div>
    </PageLayout>
  );
};

export default HomePage;
