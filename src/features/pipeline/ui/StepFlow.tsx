"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import type { StepId } from "@/features/pipeline/lib/step-metadata";
import { STEP_METADATA } from "@/features/pipeline/lib/step-metadata";

interface StepFlowProps {
  steps: StepId[];
  currentStep?: StepId;
}

export const StepFlow = ({ steps, currentStep }: StepFlowProps) => {
  if (steps.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-zinc-600">
        단계를 선택해주세요
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-2">
      {steps.map((stepId, idx) => {
        const isCurrent = stepId === currentStep;
        return (
          <React.Fragment key={stepId}>
            <span
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-mono transition-all",
                isCurrent
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40 animate-pulse"
                  : "bg-zinc-800 text-zinc-300"
              )}
            >
              {STEP_METADATA[stepId].label}
            </span>
            {idx < steps.length - 1 && (
              <span className="text-zinc-600 text-xs">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
