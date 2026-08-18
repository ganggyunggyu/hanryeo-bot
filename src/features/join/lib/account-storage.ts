import fs from "fs";
import path from "path";
import type { JoinAccount } from "@/types/join";

const ACCOUNTS_DIR = path.resolve(process.cwd(), "accounts");
const JSON_FILE = path.join(ACCOUNTS_DIR, "completed-accounts.json");
const REVIEW_INDEX_FILE = path.join(ACCOUNTS_DIR, "review-index.json");

const ensureDir = () => {
  if (!fs.existsSync(ACCOUNTS_DIR)) {
    fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
  }
};

export interface ReviewRef {
  reviewNo: string;
  boardNo: string;
  productNo?: string;
  accountId: string;
  reviewTitle?: string;
  editUrl?: string;
  lastEditedAt: string;
}

interface ReviewRefUpdate {
  reviewNo: string;
  boardNo: string;
  productNo?: string;
  reviewTitle?: string;
  editUrl?: string;
}

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
  reviewRefs?: ReviewRef[];
  review?: {
    title?: string;
  };
  [key: string]: unknown;
}

const loadAccounts = (): StoredAccount[] => {
  if (!fs.existsSync(JSON_FILE)) return [];
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  return JSON.parse(raw);
};

const writeAccounts = (accounts: StoredAccount[]) => {
  ensureDir();
  fs.writeFileSync(JSON_FILE, JSON.stringify(accounts, null, 2), "utf-8");
};

const loadReviewIndex = (): Record<string, ReviewRef> => {
  if (!fs.existsSync(REVIEW_INDEX_FILE)) return {};
  const raw = fs.readFileSync(REVIEW_INDEX_FILE, "utf-8");
  return JSON.parse(raw);
};

const writeReviewIndex = (index: Record<string, ReviewRef>) => {
  ensureDir();
  fs.writeFileSync(REVIEW_INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
};

const createReviewRefKey = (boardNo: string, reviewNo: string): string => `${boardNo}:${reviewNo}`;

export const saveAccount = (account: JoinAccount) => {
  const accounts = loadAccounts();
  accounts.push({
    id: account.id,
    password: account.password,
    name: account.name,
    email: account.email,
    phone: account.phone ?? "-",
    gender: account.gender,
    reviewCount: 0,
    purchaseCount: 0,
    createdAt: account.createdAt,
    reviewRefs: [],
  });
  writeAccounts(accounts);
};

export const getAccounts = (): StoredAccount[] => loadAccounts();

export const incrementReviewCount = (accountId: string) => {
  const accounts = loadAccounts();
  const target = accounts.find((a) => a.id === accountId);
  if (target) {
    target.reviewCount += 1;
    writeAccounts(accounts);
  }
};

export const incrementPurchaseCount = (accountId: string) => {
  const accounts = loadAccounts();
  const target = accounts.find((a) => a.id === accountId);
  if (target) {
    target.purchaseCount += 1;
    writeAccounts(accounts);
  }
};

export const upsertReviewRef = (accountId: string, update: ReviewRefUpdate): void => {
  const accounts = loadAccounts();
  const target = accounts.find((account) => account.id === accountId);
  if (!target) return;

  const reviewRef: ReviewRef = {
    reviewNo: String(update.reviewNo),
    boardNo: String(update.boardNo),
    productNo: update.productNo ? String(update.productNo) : undefined,
    accountId,
    reviewTitle: update.reviewTitle ?? target.review?.title,
    editUrl: update.editUrl,
    lastEditedAt: new Date().toISOString(),
  };

  const refs = Array.isArray(target.reviewRefs) ? [...target.reviewRefs] : [];
  const foundIndex = refs.findIndex(
    (ref) => ref.reviewNo === reviewRef.reviewNo && ref.boardNo === reviewRef.boardNo,
  );
  if (foundIndex >= 0) {
    refs[foundIndex] = { ...refs[foundIndex], ...reviewRef };
  } else {
    refs.unshift(reviewRef);
  }
  target.reviewRefs = refs;
  writeAccounts(accounts);

  const reviewIndex = loadReviewIndex();
  reviewIndex[createReviewRefKey(reviewRef.boardNo, reviewRef.reviewNo)] = reviewRef;
  writeReviewIndex(reviewIndex);
};

export const findAccountIdByReviewNo = (reviewNo: string, boardNo = "4"): string | null => {
  const reviewIndex = loadReviewIndex();
  const item = reviewIndex[createReviewRefKey(String(boardNo), String(reviewNo))];
  return item?.accountId ?? null;
};

export const getLatestReviewRefByAccountId = (accountId: string): ReviewRef | null => {
  const accounts = loadAccounts();
  const target = accounts.find((account) => account.id === accountId);
  if (!target || !Array.isArray(target.reviewRefs) || target.reviewRefs.length === 0) return null;

  return [...target.reviewRefs].sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt))[0] ?? null;
};

export const getAccountsFilePath = () => JSON_FILE;
export const getReviewIndexFilePath = () => REVIEW_INDEX_FILE;
