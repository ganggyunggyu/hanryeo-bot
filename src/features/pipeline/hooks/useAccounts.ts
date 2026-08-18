"use client";

import React from "react";
import type { StepId } from "@/features/pipeline/lib/step-metadata";

export interface StoredAccount {
  id: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  reviewCount: number;
  purchaseCount: number;
  createdAt: string;
}

export const filterAccountsBySteps = (accounts: StoredAccount[], steps: StepId[]): StoredAccount[] => {
  const needsPurchase = steps.includes("placeOrder");
  const needsReview = steps.includes("writeReview");

  return accounts.filter((a) => {
    if (needsPurchase && a.purchaseCount >= 1) return false;
    if (needsReview && a.reviewCount < 1) return false;
    return true;
  });
};

export const useAccounts = () => {
  const [list, setList] = React.useState<StoredAccount[]>([]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data: StoredAccount[] = await res.json();
      setList(data);
    } catch {
      // skip
    }
  };

  React.useEffect(() => {
    fetchAccounts();
  }, []);

  const refresh = async () => {
    await fetchAccounts();
  };

  return { list, refresh };
};
