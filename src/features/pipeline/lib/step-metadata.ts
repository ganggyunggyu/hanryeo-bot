export type StepId = "agree" | "join" | "login" | "visitProduct" | "clickBuy" | "placeOrder" | "writeReview";

export interface StepMeta {
  id: StepId;
  label: string;
  description: string;
  needsLogin: boolean;
  needsProduct: boolean;
  needsBaseUrl: boolean;
}

export const STEP_METADATA: Record<StepId, StepMeta> = {
  agree: {
    id: "agree",
    label: "약관동의",
    description: "약관 전체동의 후 다음 단계로 이동",
    needsLogin: false,
    needsProduct: false,
    needsBaseUrl: true,
  },
  join: {
    id: "join",
    label: "회원가입",
    description: "랜덤 데이터로 가입폼 작성 및 제출",
    needsLogin: false,
    needsProduct: false,
    needsBaseUrl: false,
  },
  login: {
    id: "login",
    label: "로그인",
    description: "저장된 계정으로 로그인",
    needsLogin: true,
    needsProduct: false,
    needsBaseUrl: true,
  },
  visitProduct: {
    id: "visitProduct",
    label: "제품 이동",
    description: "지정된 제품 페이지로 이동",
    needsLogin: false,
    needsProduct: true,
    needsBaseUrl: false,
  },
  clickBuy: {
    id: "clickBuy",
    label: "구매 클릭",
    description: "BUY IT NOW 버튼 클릭",
    needsLogin: false,
    needsProduct: false,
    needsBaseUrl: false,
  },
  placeOrder: {
    id: "placeOrder",
    label: "주문 완료",
    description: "주소 입력, 은행 선택, 결제 완료",
    needsLogin: true,
    needsProduct: false,
    needsBaseUrl: false,
  },
  writeReview: {
    id: "writeReview",
    label: "리뷰 수정",
    description: "내 리뷰 찾아 본문/사진 수정",
    needsLogin: true,
    needsProduct: false,
    needsBaseUrl: false,
  },
};

export const ALL_STEPS: StepId[] = [
  "agree", "join", "login", "visitProduct", "clickBuy", "placeOrder", "writeReview",
];
