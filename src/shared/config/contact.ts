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

export const getOrderPhone = (): string => requireEnv("ORDER_CONTACT_PHONE");

export const getOrderPhoneDigits = (): string =>
  getOrderPhone().replace(/[^0-9]/g, "");
