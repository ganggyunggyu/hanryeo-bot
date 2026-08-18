"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ label, className, id, ...props }: InputProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full px-3 py-2 rounded-lg",
          "bg-zinc-800 border border-zinc-700 text-zinc-100",
          "placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
          "transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
};
