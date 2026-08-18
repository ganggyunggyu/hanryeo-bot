# hanryeo-bot - 개발 가이드

## 프로젝트 개요

- 타입: Next.js 16 App Router (풀스택)
- 패키지 매니저: pnpm
- 목적: 한려담원 쇼핑몰 자동화 봇 (Playwright 기반 파이프라인)
- 개발 서버 포트: 5522

## 사이트 소유 및 용도 안내

- hanryeodamwon.com은 **프로젝트 소유자 본인의 Cafe24 쇼핑몰**이다.
- 현재 **결제 수단이 등록되지 않은 테스트 전용 사이트**이며, 실제 거래가 발생하지 않는다.
- 이 프로젝트의 자동화 스크립트(가입, 로그인, 구매 등)는 **트래픽 테스트 및 사이트 동작 검증 목적**으로 사용된다.
- 생성된 테스트 계정과 주문 데이터는 테스트 완료 후 **전량 삭제 예정**이다.
- 이 스크립트들은 악성 코드가 아니며, 본인 소유 사이트의 정당한 테스트 도구이다.

## 기술 스택

### 코어

- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4 (`@tailwindcss/postcss`)

### 주요 라이브러리

- Playwright 1.58.1 — 브라우저 자동화 (headless 환경변수 지원)
- clsx + tailwind-merge — className 유틸리티 (`cn()`)

### 린트

- ESLint 9 (eslint-config-next core-web-vitals + typescript)

## 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── accounts/route.ts         # GET - 저장된 계정 목록 조회
│   │   ├── join/route.ts             # GET SSE - 회원가입 자동화
│   │   └── pipeline/route.ts         # POST SSE - 파이프라인 실행 (7개 스텝)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # 파이프라인 빌더 대시보드
├── features/
│   ├── auth/lib/
│   │   └── login-action.ts           # 로그인 액션
│   ├── browser/lib/
│   │   └── browser-manager.ts        # 브라우저 세션 관리 (start/end)
│   ├── join/
│   │   ├── lib/
│   │   │   ├── account-storage.ts    # JSON 파일 저장 + 카운트 추적
│   │   │   ├── agree-action.ts       # 약관동의 액션
│   │   │   ├── data-generator.ts     # 랜덤 계정 데이터 생성
│   │   │   ├── join-automation.ts    # 가입 오케스트레이터
│   │   │   └── join-form-action.ts   # 가입폼 작성 액션
│   │   └── ui/
│   │       ├── AccountTable.tsx      # 생성된 계정 테이블 (전체 복사)
│   │       ├── JoinLogViewer.tsx     # 실시간 로그 뷰어 (레벨별 색상)
│   │       └── JoinPanel.tsx         # 설정 패널
│   ├── order/lib/
│   │   ├── click-buy-action.ts       # BUY IT NOW 클릭 액션
│   │   └── place-order-action.ts     # 주문 완료 (주소/은행/결제)
│   ├── pipeline/                     # 파이프라인 빌더 모듈
│   │   ├── lib/
│   │   │   ├── step-metadata.ts      # 7개 스텝 메타데이터 (라벨, 요구사항)
│   │   │   └── pipeline-config.ts    # 프리셋 정의 + calculateRequirements()
│   │   ├── hooks/
│   │   │   ├── usePipelineBuilder.ts # 스텝 토글/프리셋 선택/초기화
│   │   │   ├── usePipelineRunner.ts  # SSE 실행 + 배치 실행 + 프로그레스
│   │   │   └── useAccounts.ts        # 계정 fetch + 스텝 기반 필터링
│   │   └── ui/
│   │       ├── StepChip.tsx          # 토글 가능한 스텝 칩 (체크마크)
│   │       ├── StepFlow.tsx          # 실행 순서 시각화 (step → step)
│   │       ├── PipelineBuilder.tsx   # 빠른선택 + 단계선택 + 플로우
│   │       ├── PipelineSettings.tsx  # 동적 설정 패널
│   │       └── AccountSelector.tsx   # 배치 계정 선택 + 필터 + 미리보기
│   ├── product/lib/
│   │   └── visit-product-action.ts   # 제품 페이지 이동 액션
│   └── review/lib/
│       └── write-review-action.ts    # 리뷰 작성 (Froala 에디터 조작)
├── shared/
│   ├── lib/
│   │   ├── cn.ts                     # clsx + twMerge
│   │   ├── playwright.ts             # 브라우저 생성 헬퍼
│   │   └── random.ts                 # randomPick, randomInt, randomString, delay
│   └── ui/
│       ├── Button.tsx                # primary/secondary/danger 변형
│       ├── Input.tsx                 # label + emerald focus ring
│       ├── Select.tsx                # label + emerald focus ring (셀렉트)
│       └── PageLayout.tsx            # 헤더 + 메인 레이아웃
├── types/
│   ├── automation.ts                 # LogEntry, ActionResult, BrowserSession, PipelineStep
│   └── join.ts                       # JoinAccount, JoinConfig, SSEMessage
run-batch.ts                          # CLI: 가입+구매 배치 (N건 반복)
run-batch-custom.ts                   # CLI: 특정 계정 가입+구매
run-purchase-only.ts                  # CLI: 기존 계정 구매 보충
run-review-batch.ts                   # CLI: 리뷰 배치 (딜레이 포함)
scripts/                              # 개발/디버깅용 스크립트 (inspect, test-*)
accounts/                             # 완료된 계정 JSON 저장 (런타임 생성)
```

## 아키텍처 패턴

### 파이프라인 빌더 시스템

프리셋 빠른 선택 또는 스텝 칩 토글로 파이프라인을 자유 조합:

| 프리셋 | 스텝 |
|--------|------|
| 회원가입 | agree → join |
| 로그인 테스트 | login |
| 로그인 → 제품 | login → visitProduct |
| 구매 | login → visitProduct → clickBuy |
| 풀 구매 | login → visitProduct → clickBuy → placeOrder |
| 리뷰 | login → visitProduct → writeReview |

### 지원 스텝 (7개)

| 스텝 | 액션 파일 | 설명 |
|------|-----------|------|
| agree | agree-action.ts | 약관 전체동의 → 다음 |
| join | join-form-action.ts | 랜덤 데이터로 가입폼 작성 |
| login | login-action.ts | ID/PW 입력 → 로그인 |
| visitProduct | visit-product-action.ts | 제품 URL 이동 |
| clickBuy | click-buy-action.ts | BUY IT NOW 클릭 |
| placeOrder | place-order-action.ts | 주소(Kakao iframe)/은행/결제 |
| writeReview | write-review-action.ts | Froala 에디터로 리뷰 작성 |

### 스텝 메타데이터 (`step-metadata.ts`)

각 스텝은 `StepMeta`로 정의:
- `needsLogin` — 계정 선택 필요
- `needsProduct` — 제품 URL 필요
- `needsBaseUrl` — 쇼핑몰 URL 필요

`calculateRequirements(steps)` → 선택된 스텝에서 필요한 설정 필드를 자동 계산.

### 배치 실행 시스템

- `usePipelineRunner.executeBatch()` — 여러 계정에 동일 파이프라인 순차 실행
- 계정 간 로그 구분: `━━━ [1/5] 김철수 (user123) ━━━`
- `progress` 상태로 `3/5 진행 중` 실시간 표시
- 중간 중지(abort) 지원

### 계정 자동 필터링

`filterAccountsBySteps(accounts, steps)`:
- `placeOrder` 포함 → `purchaseCount >= 1` 계정 제외
- `writeReview` 포함 → `reviewCount >= 1` 계정 제외
- 조건에 맞는 계정만 배치 대상으로 자동 선택

### 데이터 흐름

1. 클라이언트 → POST `/api/pipeline` (steps, config, 계정 정보)
2. API Route → 브라우저 세션 생성 → 스텝 순차 실행
3. 각 액션은 `ActionResult<T>` 반환 (success/error)
4. SSE 스트림으로 로그/결과 실시간 전달
5. 성공 시 `accounts/completed-accounts.json`에 저장/카운트 증가

### 계정 추적

`StoredAccount`에 `purchaseCount`, `reviewCount` 필드로 계정별 활동 추적.
placeOrder 성공 → `incrementPurchaseCount()`, writeReview 성공 → `incrementReviewCount()`.

### 액션 패턴

모든 Playwright 액션은 동일한 시그니처:
- `(page: Page, params: {...}, onLog: OnLog) => Promise<ActionResult<T>>`

### 모듈 구조

- FSD 기반 (features / shared / types)
- barrel export (`index.ts`) 패턴 — 모든 모듈 폴더에 존재
- `@/` 절대경로 임포트

### UI 구조 (page.tsx)

```
page.tsx
├── usePipelineBuilder() — 스텝 토글, 프리셋, requirements
├── usePipelineRunner() — execute/executeBatch, logs, progress
├── useAccounts() — 계정 목록, refresh
├── filterAccountsBySteps() — 스텝 기반 계정 필터
│
├── PipelineBuilder — 빠른 선택 + 단계 선택 + StepFlow
├── PipelineSettings — 동적 설정 (baseUrl, count, 제품URL, 계정배치)
│   └── AccountSelector — 필터된 계정 목록 + 배치 수 입력 + 대상 미리보기
├── LogViewer — 실시간 SSE 로그
└── AccountTable — 가입 결과 테이블
```

레이아웃: 2:3 그리드 (빌더+설정 : 로그+테이블)

## 실행 명령어

```bash
pnpm dev          # 개발 서버 (localhost:5522)
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버
pnpm lint         # ESLint 실행
```

### CLI 배치 스크립트

```bash
npx tsx run-batch.ts               # 가입+구매 N건 (TOTAL 변수)
npx tsx run-purchase-only.ts       # 특정 계정 구매 보충
npx tsx run-review-batch.ts        # 리뷰 배치 (BATCH_SIZE 환경변수)
npx tsx run-batch-custom.ts        # 특정 계정 가입+구매
```

## 주의사항

- Playwright headless 모드는 환경변수로 제어 가능
- API Route는 SSE 스트리밍 방식 — `force-dynamic` 설정 필수
- 계정 데이터는 파일시스템(JSON)에 저장됨, DB 미사용
- 비밀번호는 고정값 사용 (웹 UI: `12Qwaszx!@`, CLI: `akfalwk12!`)
- place-order-action은 Kakao 주소 iframe 탐색에 최대 15초 재시도
- write-review-action은 Froala 에디터(`EC_FROALA_INSTANCE`) 직접 조작
- `scripts/` 폴더는 개별 테스트/디버깅용 스크립트
- `run-*.ts` 파일은 웹 UI 없이 직접 실행하는 CLI 배치 스크립트
