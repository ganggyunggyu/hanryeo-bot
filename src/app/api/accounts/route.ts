import { NextResponse } from "next/server";
import { getAccounts } from "@/features/join/lib/account-storage";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const accounts = getAccounts();
  return NextResponse.json(accounts);
};
