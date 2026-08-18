"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const PageLayout = ({ children, className }: PageLayoutProps) => {
  return (
    <div
      className={cn(
        "min-h-screen bg-zinc-950 text-zinc-100",
        "flex flex-col",
        className
      )}
    >
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-100">
          Hanryeo Pipeline
        </h1>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};
