import type { StepId } from "./step-metadata";
import { STEP_METADATA } from "./step-metadata";

export interface Preset {
  label: string;
  description: string;
  steps: StepId[];
}

export const PRESETS: Preset[] = [
  {
    label: "회원가입",
    description: "약관동의 → 가입폼 작성 → 제출",
    steps: ["agree", "join"],
  },
  {
    label: "로그인 테스트",
    description: "계정으로 로그인 확인",
    steps: ["login"],
  },
  {
    label: "로그인 → 제품",
    description: "로그인 후 제품 페이지 이동",
    steps: ["login", "visitProduct"],
  },
  {
    label: "구매",
    description: "로그인 → 제품 → BUY IT NOW",
    steps: ["login", "visitProduct", "clickBuy"],
  },
  {
    label: "풀 구매",
    description: "로그인 → 제품 → 구매 → 결제",
    steps: ["login", "visitProduct", "clickBuy", "placeOrder"],
  },
  {
    label: "리뷰",
    description: "로그인 → 내 리뷰 찾기 → 수정(이미지 붙여넣기)",
    steps: ["login", "writeReview"],
  },
];

export interface PipelineRequirements {
  needsLogin: boolean;
  needsProduct: boolean;
  needsBaseUrl: boolean;
  needsCount: boolean;
}

export const calculateRequirements = (steps: StepId[]): PipelineRequirements => {
  const result: PipelineRequirements = {
    needsLogin: false,
    needsProduct: false,
    needsBaseUrl: false,
    needsCount: false,
  };

  for (const stepId of steps) {
    const meta = STEP_METADATA[stepId];
    if (meta.needsLogin) result.needsLogin = true;
    if (meta.needsProduct) result.needsProduct = true;
    if (meta.needsBaseUrl) result.needsBaseUrl = true;
  }

  const hasJoin = steps.includes("join");
  if (hasJoin) result.needsCount = true;

  return result;
};
