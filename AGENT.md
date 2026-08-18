# hanryeo-bot Agent Notes

한려담원 Cafe24 쇼핑몰 자동화 저장소입니다. 이 문서는 에이전트가 작업을 시작할 때 먼저 읽는 판단 기준입니다. 사람이 읽는 설치/사용법은 `README.md`에 있습니다.

## 처음 들어왔을 때

1. 이 문서로 제약과 판단 기준을 잡습니다.
2. `docs/repo-map.json`으로 저장소 구조를 파악합니다. 진입점, 환경변수, 데이터 흐름이 구조화되어 있습니다.
3. 반복 작업은 `.claude/commands/`에 절차가 정의되어 있으니 새로 만들지 말고 그것을 씁니다.

환경 세팅을 요청받았다면 `README.md`의 `에이전트 온보딩` 절차를 따릅니다. 요약하면 이렇습니다.

```bash
pnpm install && pnpm exec playwright install chromium
```

무엇이 빠졌는지 확인합니다. 실패 항목마다 해결 명령이 함께 나오고, 실패가 있으면 종료 코드 1입니다.

```bash
pnpm setup:check
```

사용자에게 물어볼 값의 목록과 용도를 뽑습니다. `--task=account,review,qna,sheet`로 범위를 좁힐 수 있습니다.

```bash
pnpm setup:ask
```

비밀번호와 API 키는 사용자가 직접 `.env`에 넣게 합니다. 에이전트는 어떤 키에 무엇이 필요한지 안내하고 채워졌는지만 확인합니다.

`docs/repo-map.json`과 `docs/REPOSITORY.md`는 손으로 고치지 않습니다. 코드가 바뀌면 다시 생성합니다.

```bash
pnpm repo:parse
```

## Stack

- Next.js 16 App Router + React + TypeScript
- 패키지 매니저: `pnpm`
- 브라우저 자동화: Playwright (Chromium)
- 개발 서버 포트: 5522
- Lint: `pnpm lint`

## 실행 규칙

- 스크립트는 `pnpm tsx <파일>`로 실행합니다. 상대 경로 import에 확장자가 없어 순수 `node`로는 실행되지 않습니다.
- `scripts/repo-parser/`만 예외입니다. 확장자를 붙여 두어 의존성 없이 `node`로 돌아갑니다.
- 실행 계열 스크립트는 실제 쇼핑몰에 회원가입과 주문을 발생시킵니다. 동작 확인 목적으로 함부로 실행하지 않습니다.

## 자격증명 규칙

- 비밀번호, 연락처, API 키를 코드에 직접 쓰지 않습니다. `src/shared/config`에서 가져옵니다.
  - `getAdminPassword()`, `getAccountPassword()`, `getLegacyAccountPassword()`, `ADMIN_MALL_ID`
  - `getOrderPhone()`, `getOrderPhoneDigits()`
- 계정 데이터는 `accounts/` 아래에 두고 git에 올리지 않습니다. 예시 파일만 `*.example.json`으로 추적합니다.
- 커밋 전에 점검합니다. 비밀번호나 API 키가 남아 있으면 종료 코드 1로 실패합니다.

```bash
pnpm repo:check
```

## 새 스크립트를 추가할 때

파일 상단에 블록 주석으로 설명과 `Usage:`를 답니다. 파서가 이 주석을 읽어 문서의 사용법 섹션을 채웁니다.

```ts
/**
 * 리뷰 이미지 배치
 * 기존 리뷰에 이미지 세트를 붙인다.
 *
 * Usage:
 *   pnpm tsx run-review-image-batch.ts
 *   TARGET_ACCOUNT_ID=abc1234 pnpm tsx run-review-image-batch.ts
 */
```

일회성 탐색 스크립트는 `.gitignore`에 이미 패턴이 잡혀 있습니다. 저장소에 남길 것과 로컬에서만 쓸 것을 구분합니다.

## 사이트 소유 및 용도

- hanryeodamwon.com은 프로젝트 소유자 본인의 Cafe24 쇼핑몰입니다.
- 결제 수단이 등록되지 않은 테스트 전용 사이트이며 실제 거래가 발생하지 않습니다.
- 자동화 스크립트는 트래픽 테스트 및 사이트 동작 검증 목적으로 사용합니다.

## Google Sheet Automation

- 인증 환경변수: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`
- 구매 파이프라인 시트: `run-daily-pipeline.ts` → `가구매 리뷰 계정`
- 리뷰 하이라이트: `pnpm sheet:review-highlight "시트탭이름"` 으로 `리뷰작성`이 `O`인 행의 참여 ID 셀에 색을 칠합니다

## QNA Auto-Reply Flow

- 배치 스크립트: `run-qna-reply-batch.ts`
- 답변 생성: `src/features/qna/lib/qna-reply-templates.ts` (`getReplyForQuestion(title)`)

## Brand/Copy Constraints (Hanryeodamwon)

- 인사말은 `안녕하세요 한려담원입니다.`
- 맺음말에 `감사합니다.` 포함
- 고객센터 톤: 격식 있되 따뜻하게. 구매를 막지 않고, `안전하다`/`문제없다` 같은 단정과 질병 치료 주장을 피합니다
- 건강, 복약, 임신, 소아, 고령 관련: 개인차 문구를 넣고 `담당 의사 선생님과 상의`를 권합니다

## Product Facts (Use as Verifiable Claims Only)

- 원산지: `지리산 8만평 규모 자연방목` 국내산 흑염소
- 배합: 흑염소 원물 `11%`
- 용량: `1포 90mL`
- 공정: `105℃ 48시간 저온 추출`, `기름 제거 공정`으로 잡내 감소
- 가열: 파우치를 전자레인지에 직접 넣지 않고 컵에 옮기거나 중탕

## Reply Type Routing (A/B/C)

- A (운영/CS): 배송, 선물 포장, 보관 및 유통기한, 환불 반품. 간결하고 조치 중심으로
- B (제품 정보): 성분, 원산지, 공정, 품질, 영양. 사실을 분명히
- C (섭취/건강): 복용량, 시점, 병용, 건강 우려. 실용적 안내 + 개인차 + 상담 권유

## Operational Rules

- 배송지는 한 번 지정하면 바꾸지 않습니다. 시트 배송지와 실제 주문 배송지가 같아야 합니다. 후보는 `run-daily-pipeline.ts`의 `ADDRESS_POOL`에 있습니다
- 리뷰 매칭은 제목이 아니라 이름 첫 글자(성씨)로 합니다. 저장된 `review.title`은 새로 쓸 리뷰의 제목이라 실제 등록된 제목과 다릅니다
- 리뷰 작업은 상품 페이지의 리뷰 탭에서만 합니다. URL 직접 이동 대신 링크를 클릭해 이동합니다
- 리뷰 이미지는 webp로 변환한 뒤 올립니다. 원본 jpg는 용량 때문에 업로드가 실패합니다
