"use client";

import React from "react";
import type { StepId } from "@/features/pipeline/lib/step-metadata";
import type { Preset, PipelineRequirements } from "@/features/pipeline/lib/pipeline-config";
import { PRESETS, calculateRequirements } from "@/features/pipeline/lib/pipeline-config";

export const usePipelineBuilder = () => {
  const [selectedSteps, setSelectedSteps] = React.useState<StepId[]>([]);
  const [activePresetIndex, setActivePresetIndex] = React.useState<number | null>(null);

  const requirements: PipelineRequirements = React.useMemo(
    () => calculateRequirements(selectedSteps),
    [selectedSteps]
  );

  const toggleStep = (stepId: StepId) => {
    setActivePresetIndex(null);
    setSelectedSteps((prev) => {
      if (prev.includes(stepId)) {
        return prev.filter((s) => s !== stepId);
      }
      return [...prev, stepId];
    });
  };

  const setFromPreset = (index: number) => {
    const preset: Preset = PRESETS[index];
    setActivePresetIndex(index);
    setSelectedSteps([...preset.steps]);
  };

  const clearSteps = () => {
    setActivePresetIndex(null);
    setSelectedSteps([]);
  };

  return {
    selectedSteps,
    activePresetIndex,
    requirements,
    toggleStep,
    setFromPreset,
    clearSteps,
  };
};
