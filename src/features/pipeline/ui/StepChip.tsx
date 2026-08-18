"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";

interface StepChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  running?: boolean;
  onClick: () => void;
}

export const StepChip = ({ label, selected, disabled, running, onClick }: StepChipProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        "border",
        selected
          ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600",
        running && "animate-pulse",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {selected && (
        <span className="mr-1">&#10003;</span>
      )}
      {label}
    </button>
  );
};
