export type EnvRequirement = {
  key: string;
  label: string;
  tasks: string[];
  optional?: boolean;
  hint: string;
};

export const ENV_REQUIREMENTS: EnvRequirement[] = [
  {
    key: "CAFE24_MALL_ID",
    label: "쇼핑몰 ID",
    tasks: ["qna"],
    optional: true,
    hint: "관리자 로그인 화면의 몰 아이디. 비워 두면 hanryeodamwon 을 씁니다",
  },
  {
    key: "CAFE24_ADMIN_PASSWORD",
    label: "쇼핑몰 관리자 비밀번호",
    tasks: ["qna"],
    hint: "Cafe24 관리자(admin) 계정 비밀번호",
  },
  {
    key: "REVIEW_ACCOUNT_PASSWORD",
    label: "신규 계정 공용 비밀번호",
    tasks: ["account", "review"],
    hint: "새로 만들 회원 계정에 일괄 적용할 비밀번호",
  },
  {
    key: "REVIEW_ACCOUNT_PASSWORD_LEGACY",
    label: "구 계정 공용 비밀번호",
    tasks: ["review", "qna"],
    hint: "기존에 만들어 둔 계정들의 비밀번호. 없으면 신규와 같은 값을 넣습니다",
  },
  {
    key: "ORDER_CONTACT_PHONE",
    label: "주문 수취인 연락처",
    tasks: ["account"],
    hint: "주문서에 넣을 연락처. 010-0000-0000 형식",
  },
  {
    key: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    label: "구글 서비스 계정 이메일",
    tasks: ["sheet"],
    hint: "GCP 서비스 계정의 client_email. 대상 시트에 편집자로 공유해 두어야 합니다",
  },
  {
    key: "GOOGLE_PRIVATE_KEY",
    label: "구글 서비스 계정 개인키",
    tasks: ["sheet"],
    hint: "서비스 계정 JSON의 private_key. 줄바꿈을 \\n 으로 바꿔 한 줄로 넣습니다",
  },
  {
    key: "GOOGLE_SHEET_ID",
    label: "구글 스프레드시트 ID",
    tasks: ["sheet"],
    hint: "시트 URL의 /d/ 와 /edit 사이 문자열",
  },
  {
    key: "CAPTCHA_API_KEY",
    label: "2captcha API 키",
    tasks: ["qna"],
    optional: true,
    hint: "문의 등록 흐름에 캡차가 뜰 때만 필요합니다",
  },
];

export const TASK_LABELS: Record<string, string> = {
  account: "계정 생성과 구매",
  review: "리뷰 작성과 이미지 첨부",
  qna: "문의 등록과 관리자 답변",
  sheet: "구글 시트 기록",
};
