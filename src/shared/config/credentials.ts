import dotenv from "dotenv";

dotenv.config({ quiet: true });

const requireEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `${key} 환경변수가 없습니다. .env.example을 복사해 .env를 채운 뒤 다시 실행하세요.`
    );
  }

  return value;
};

export const ADMIN_MALL_ID = process.env.CAFE24_MALL_ID ?? "hanryeodamwon";

export const getAdminPassword = (): string => requireEnv("CAFE24_ADMIN_PASSWORD");

export const getAccountPassword = (): string =>
  requireEnv("REVIEW_ACCOUNT_PASSWORD");

export const getLegacyAccountPassword = (): string =>
  requireEnv("REVIEW_ACCOUNT_PASSWORD_LEGACY");
