"use client";

import React from "react";
import { cn } from "@/shared/lib/cn";
import type { JoinAccount } from "@/types/join";

interface AccountTableProps {
  accounts: JoinAccount[];
}

export const AccountTable = ({ accounts }: AccountTableProps) => {
  const handleCopyAll = () => {
    const successAccounts = accounts.filter((a) => a.status === "success");
    const text = successAccounts
      .map((a) => `${a.id}\t${a.password}\t${a.name}\t${a.email}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900",
        "flex flex-col"
      )}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">
          생성된 계정 ({accounts.filter((a) => a.status === "success").length}/
          {accounts.length})
        </h2>
        {accounts.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            전체 복사
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-4 py-2 text-left font-medium">#</th>
              <th className="px-4 py-2 text-left font-medium">상태</th>
              <th className="px-4 py-2 text-left font-medium">이름</th>
              <th className="px-4 py-2 text-left font-medium">아이디</th>
              <th className="px-4 py-2 text-left font-medium">비밀번호</th>
              <th className="px-4 py-2 text-left font-medium">이메일</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-600"
                >
                  아직 생성된 계정이 없습니다.
                </td>
              </tr>
            )}
            {accounts.map((account, idx) => (
              <tr
                key={idx}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-2 text-zinc-500">{idx + 1}</td>
                <td className="px-4 py-2">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                      account.status === "success" &&
                        "bg-emerald-500/10 text-emerald-400",
                      account.status === "failed" &&
                        "bg-red-500/10 text-red-400",
                      account.status === "pending" &&
                        "bg-zinc-500/10 text-zinc-400"
                    )}
                  >
                    {account.status === "success"
                      ? "성공"
                      : account.status === "failed"
                        ? "실패"
                        : "대기"}
                  </span>
                </td>
                <td className="px-4 py-2 text-zinc-300">{account.name}</td>
                <td className="px-4 py-2 text-zinc-300 font-mono">
                  {account.id}
                </td>
                <td className="px-4 py-2 text-zinc-300 font-mono">
                  {account.password}
                </td>
                <td className="px-4 py-2 text-zinc-300">{account.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
