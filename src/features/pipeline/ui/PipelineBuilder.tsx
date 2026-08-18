"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import type { StepId } from "@/features/pipeline/lib/step-metadata";
import { ALL_STEPS, STEP_METADATA } from "@/features/pipeline/lib/step-metadata";
import { PRESETS } from "@/features/pipeline/lib/pipeline-config";
import { StepChip } from "./StepChip";
import { StepFlow } from "./StepFlow";

interface PipelineBuilderProps {
  selectedSteps: StepId[];
  activePresetIndex: number | null;
  disabled: boolean;
  onToggleStep: (stepId: StepId) => void;
  onSelectPreset: (index: number) => void;
  onClear: () => void;
}

export const PipelineBuilder = ({
  selectedSteps,
  activePresetIndex,
  disabled,
  onToggleStep,
  onSelectPreset,
  onClear,
}: PipelineBuilderProps) => {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">파이프라인 구성</h2>
        {selectedSteps.length > 0 && (
          <button
            onClick={onClear}
            disabled={disabled}
            className={cn(
              "text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            초기화
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">빠른 선택</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPreset(idx)}
                disabled={disabled}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  activePresetIndex === idx
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">단계 선택</span>
          <div className="flex flex-wrap gap-2">
            {ALL_STEPS.map((stepId) => (
              <StepChip
                key={stepId}
                label={STEP_METADATA[stepId].label}
                selected={selectedSteps.includes(stepId)}
                disabled={disabled}
                onClick={() => onToggleStep(stepId)}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-800" />

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">실행 순서</span>
          <StepFlow steps={selectedSteps} />
        </div>
      </div>
    </div>
  );
};
