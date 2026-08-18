# hanryeo-bot

한려담원(hanryeodamwon.com) Cafe24 쇼핑몰 운영 자동화 도구입니다. Playwright로 쇼핑몰을 조작하고, 결과를 구글 시트에 기록합니다.

크게 두 가지 방법으로 씁니다.

- **웹 UI** — `pnpm dev`로 대시보드를 띄우고 파이프라인을 조립해 실행합니다.
- **CLI 스크립트** — `pnpm tsx <파일>`로 배치 작업을 직접 돌립니다.

> 저장소만 받아 든 상태라면 [에이전트 온보딩](#에이전트-온보딩)부터 보세요. 환경 세팅부터 실행까지 순서대로 정리해 두었습니다.

---

## 목차

- [무엇을 하는 도구인가](#무엇을-하는-도구인가)
- [설치](#설치)
- [환경변수](#환경변수)
- [웹 UI로 실행하기](#웹-ui로-실행하기)
- [CLI 스크립트로 실행하기](#cli-스크립트로-실행하기)
- [저장소 파서](#저장소-파서)
- [저장소 구조](#저장소-구조)
- [데이터 파일](#데이터-파일)
- [에이전트 온보딩](#에이전트-온보딩)
- [운영 규칙](#운영-규칙)
- [트러블슈팅](#트러블슈팅)

---

## 무엇을 하는 도구인가

한려담원 쇼핑몰에서 반복 작업을 자동으로 처리합니다.

| 작업 | 내용 |
| --- | --- |
| 계정 생성 | 이름, 아이디, 이메일, 배송지를 조합해 신규 회원을 가입시킵니다 |
| 구매 | 가입한 계정으로 제품을 주문합니다 |
| 리뷰 | 상품 후기를 작성하거나 기존 후기에 이미지를 추가합니다 |
| QNA | 상품 문의를 등록하고, 관리자 계정으로 답변을 답니다 |
| 시트 기록 | 위 결과를 구글 시트에 남깁니다 |

파이프라인은 7단계로 이루어집니다.

```
약관동의 → 회원가입 → 로그인 → 제품 이동 → 구매 클릭 → 주문 완료 → 리뷰 수정
```

웹 UI에서는 이 중 필요한 단계만 골라 조합할 수 있습니다. CLI 스크립트는 대개 특정 조합을 고정해 둔 것입니다.

---

## 설치

### 요구사항

- Node.js 22 이상
- pnpm 10 이상
- Playwright용 Chromium

### 절차

```bash
pnpm install
```

```bash
pnpm exec playwright install chromium
```

```bash
cp .env.example .env
```

`.env`를 열어 값을 채웁니다. 자세한 내용은 [환경변수](#환경변수)를 참고하세요.

설정이 끝나면 준비 상태를 점검합니다. 런타임, 환경변수, 데이터 파일을 확인하고 빠진 것마다 해결 방법을 알려줍니다.

```bash
pnpm setup:check
```

무엇을 채워야 할지 모르겠다면 필요한 값의 목록과 용도를 출력합니다.

```bash
pnpm setup:ask
```

---

## 환경변수

전부 `.env`에 넣습니다. `.env`는 git에 올라가지 않습니다. 항목별 설명은 `.env.example`에 주석으로 달려 있습니다.

### 필수

| 키 | 용도 |
| --- | --- |
| `CAFE24_MALL_ID` | 쇼핑몰 ID. 관리자 로그인에 사용합니다 |
| `CAFE24_ADMIN_PASSWORD` | 쇼핑몰 관리자 비밀번호. QNA 답변 등 관리자 작업에 필요합니다 |
| `REVIEW_ACCOUNT_PASSWORD` | 신규 생성 계정의 공용 비밀번호 |
| `REVIEW_ACCOUNT_PASSWORD_LEGACY` | 초기에 만든 구 계정의 공용 비밀번호 |
| `ORDER_CONTACT_PHONE` | 주문서 수취인 연락처. 하이픈이 있어도 자동으로 처리합니다 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 구글 서비스 계정 이메일 |
| `GOOGLE_PRIVATE_KEY` | 서비스 계정 개인키. 줄바꿈은 `\n`으로 이스케이프해 한 줄로 넣습니다 |
| `GOOGLE_SHEET_ID` | 기록 대상 스프레드시트 ID |

### 선택

| 키 | 기본값 | 용도 |
| --- | --- | --- |
| `HEADLESS` | `false` | `true`면 브라우저 창을 띄우지 않습니다 |
| `DRY_RUN` | `false` | 실제 반영 없이 동작만 확인합니다 |
| `VERBOSE` | `false` | 로그를 자세히 출력합니다 |
| `BATCH_SIZE` | 스크립트마다 다름 | 한 번에 처리할 건수 |
| `MIN_DELAY` / `MAX_DELAY` | 스크립트마다 다름 | 작업 간 지연 시간(분) |
| `CAPTCHA_API_KEY` | 없음 | 2captcha API 키. 캡차가 뜨는 흐름에서 필요합니다 |
| `TARGET_ACCOUNT_ID` | 없음 | 특정 계정만 처리 |
| `TARGET_NAME_PREFIX` | 없음 | 이름 앞글자(성씨)로 대상을 거릅니다 |
| `REVIEW_LIMIT` / `REVIEW_PAGE_LIMIT` | 없음 | 리뷰 스캔 범위 제한 |

전체 목록과 실제 사용처는 `docs/REPOSITORY.md`의 환경변수 표에서 확인할 수 있습니다.

---

## 웹 UI로 실행하기

```bash
pnpm dev
```

`http://localhost:5522`에서 대시보드가 열립니다.

화면 구성은 다음과 같습니다.

1. **파이프라인 빌더** — 7단계 중 실행할 단계를 고릅니다. 고른 단계에 따라 필요한 입력값이 달라집니다.
2. **설정** — 쇼핑몰 주소, 제품 URL, 실행 횟수를 지정합니다.
3. **계정 테이블** — `accounts/completed-accounts.json`을 읽어 계정 목록을 보여줍니다. 선택한 단계에 맞는 계정만 걸러서 표시합니다.
4. **로그 뷰어** — 실행 중 진행 상황이 실시간으로 찍힙니다.

내부적으로는 아래 API를 호출합니다.

| 경로 | 메서드 | 역할 |
| --- | --- | --- |
| `/api/pipeline` | POST | 조립한 파이프라인을 실행합니다 |
| `/api/join` | GET | 가입 흐름을 실행합니다 |
| `/api/accounts` | GET | 저장된 계정 목록을 반환합니다 |

---

## CLI 스크립트로 실행하기

모든 스크립트는 `pnpm tsx`로 실행합니다. 상대 경로 import에 확장자가 없어 순수 `node`로는 실행되지 않습니다.

### 계정 생성과 구매

일일 파이프라인입니다. 계정을 만들고, 구매하고, 구글 시트에 기록하는 것까지 한 번에 처리합니다.

```bash
pnpm tsx run-daily-pipeline.ts
```

인자를 주면 동작이 달라집니다.

```bash
pnpm tsx run-daily-pipeline.ts 3
```

숫자를 주면 그 개수만큼 신규 계정을 만듭니다. 계정 ID를 주면 기존 계정으로 구매만 진행합니다.

```bash
pnpm tsx run-daily-pipeline.ts jiyoung4433
```

대량 가입이 필요하면 배치 스크립트를 씁니다. 처리 건수는 파일 상단 `TOTAL` 상수에 있습니다.

```bash
HEADLESS=true pnpm tsx run-batch.ts
```

특정 계정만 골라 처리하려면 `accounts/custom-targets.json`에 대상을 적고 커스텀 배치를 돌립니다. 양식은 `accounts/custom-targets.example.json`에 있습니다.

```bash
pnpm tsx run-batch-custom.ts
```

이미 가입된 계정으로 구매만 하려면 다음을 씁니다.

```bash
pnpm tsx run-purchase-only.ts
```

### 리뷰

리뷰 작성 배치입니다. 건수와 간격을 환경변수로 조절합니다.

```bash
BATCH_SIZE=20 MIN_DELAY=5 MAX_DELAY=12 pnpm tsx run-review-batch.ts
```

기존 리뷰에 이미지를 붙이는 배치입니다. 이미지는 `한려담원_리뷰사진/` 아래 세트 단위로 관리합니다.

```bash
pnpm tsx run-review-image-batch.ts
```

리뷰 원고를 구글 시트로 내보냅니다.

```bash
pnpm tsx scripts/export-reviews.ts
```

리뷰 이미지를 webp로 변환합니다. 원본 jpg는 용량이 커서 그대로 올리면 업로드가 실패합니다.

```bash
QUALITY=80 MAX_SIZE=1280 pnpm tsx scripts/convert-review-images-to-webp.ts
```

시트에서 `리뷰작성` 열이 `O`인 행의 참여 ID 셀에 색을 칠합니다.

```bash
pnpm sheet:review-highlight "시트탭이름"
```

### QNA

상품 문의를 등록합니다. 캡차가 뜨는 흐름이라 `CAPTCHA_API_KEY`가 필요합니다.

```bash
BATCH_SIZE=10 pnpm tsx run-qna-batch.ts
```

관리자 계정으로 로그인해 미답변 문의에 답변을 답니다. 답변 문구는 `src/features/qna/lib/qna-reply-templates.ts`의 `getReplyForQuestion(title)`이 결정합니다.

```bash
pnpm tsx run-qna-reply-batch.ts
```

문의 등록과 답변을 한 번에 처리합니다.

```bash
pnpm tsx run-qna-write-and-reply.ts
```

### 슬래시 커맨드

Claude Code에서 쓰는 커맨드가 `.claude/commands/`에 있습니다. 각 커맨드는 원고 작성부터 등록까지의 절차를 담고 있습니다.

| 커맨드 | 역할 |
| --- | --- |
| `/daily-pipeline [숫자\|계정ID]` | 계정 생성 → 구매 → 시트 기록 |
| `/write-review [숫자]` | 리뷰 원고 작성 → 구글 시트 내보내기 |
| `/write-news [숫자]` | 소식 게시판 원고 작성 → 글 등록 |

---

## 저장소 파서

`scripts/repo-parser/`는 이 저장소를 직접 훑어 구조 문서를 생성하는 도구입니다. 스크립트가 100개 가까이 흩어져 있어 사람이 손으로 목록을 유지하기 어렵기 때문에 만들었습니다.

뽑아내는 항목은 다음과 같습니다.

- 실행 진입점과 각 파일이 쓰는 환경변수, 읽고 쓰는 데이터 파일, 접속하는 호스트
- `src/features` 슬라이스별 세그먼트와 공개 API
- API 라우트와 메서드
- 환경변수별 사용처
- 하드코딩된 비밀번호, API 키, 연락처, 주소 (값은 마스킹해서 기록)

### 사용법

문서와 맵을 생성합니다. `docs/REPOSITORY.md`와 `docs/repo-map.json`이 갱신됩니다.

```bash
pnpm repo:parse
```

비밀번호나 API 키가 하드코딩되어 있으면 종료 코드 1로 실패합니다. 커밋 훅이나 CI에 걸어 쓸 수 있습니다.

```bash
pnpm repo:check
```

파일을 쓰지 않고 마크다운만 출력합니다.

```bash
node scripts/repo-parser/index.ts --stdout
```

출력 경로를 직접 지정할 수도 있습니다.

```bash
node scripts/repo-parser/index.ts --md docs/구조.md --json docs/map.json
```

파서 자체는 외부 의존성 없이 Node 내장 모듈만 쓰므로 `node`로 바로 실행됩니다.

### 심각도 기준

`repo:check`는 `high`만 실패로 처리합니다.

| 심각도 | 대상 | 실패 여부 |
| --- | --- | --- |
| `high` | 비밀번호, API 키, 액세스 토큰 | 실패 |
| `medium` | 전화번호, 이메일 | 통과 (경고만) |
| `low` | 주소 | 통과 (경고만) |

`run-daily-pipeline.ts`의 `ADDRESS_POOL`은 배송지 후보 목록이라 `low`로 잡히지만 정상입니다.

### 모듈 구성

| 파일 | 역할 |
| --- | --- |
| `index.ts` | CLI 진입점 |
| `build-repo-map.ts` | 각 파서를 호출해 전체 맵을 조립 |
| `collect-files.ts` | `git ls-files` 기반 파일 수집 (git이 없으면 디렉터리 순회) |
| `parse-entrypoint.ts` | 실행 스크립트 하나를 분석 |
| `parse-feature.ts` | `src/features` 슬라이스 분석 |
| `parse-api-route.ts` | API 라우트와 메서드 추출 |
| `parse-env.ts` | 환경변수 사용처 수집 |
| `detect-secrets.ts` | 자격증명 탐지와 마스킹 |
| `render-markdown.ts` | 마크다운 렌더링 |
| `types.ts` | 공유 타입 |

---

## 저장소 구조

```
├── src/
│   ├── app/              Next.js App Router (대시보드 + API 라우트)
│   ├── features/         기능 슬라이스 (FSD)
│   │   ├── auth/         일반 로그인, 관리자 로그인
│   │   ├── browser/      Playwright 세션 관리
│   │   ├── join/         약관 동의, 회원가입, 계정 생성/저장
│   │   ├── order/        구매 클릭, 주문 완료
│   │   ├── pipeline/     파이프라인 조립 UI와 실행 훅
│   │   ├── product/      제품 페이지 이동
│   │   ├── qna/          문의 등록, 답변 작성, 답변 템플릿
│   │   └── review/       리뷰 작성/수정
│   ├── shared/
│   │   ├── config/       환경변수 기반 자격증명과 연락처
│   │   ├── lib/          공용 유틸
│   │   └── ui/           공용 컴포넌트
│   └── types/            공용 타입
├── scripts/              보조 스크립트와 저장소 파서
├── docs/                 가이드 문서와 파서 산출물
├── accounts/             계정 데이터 (git 제외, 예시 파일만 추적)
├── prompts/              원고 생성용 프롬프트
└── 한려담원_리뷰사진/      리뷰 이미지 (git 제외)
```

기능 슬라이스는 배럴을 통해 공개합니다. 슬라이스 외부에서는 내부 경로를 직접 파고들지 말고 배럴에서 가져옵니다.

```ts
import { loginAction } from "@/features/auth";
```

파일별 상세 목록은 `docs/REPOSITORY.md`에 있습니다.

---

## 데이터 파일

`accounts/` 아래 파일은 개인정보를 담고 있어 git에 올리지 않습니다. 저장소를 새로 클론하면 직접 채워야 합니다.

| 파일 | 내용 |
| --- | --- |
| `completed-accounts.json` | 생성 완료된 계정 목록. id, password, name, 배송지 등 |
| `review-index.json` | 리뷰 작성/수정 추적 상태 |
| `review-account-map.json` | 리뷰 번호와 계정 매핑 |
| `custom-targets.json` | `run-batch-custom.ts`가 처리할 대상. 예시는 `custom-targets.example.json` |

`한려담원_리뷰사진/`도 용량 때문에 git에서 제외했습니다. 세트별로 이미지 3장씩 묶여 있고, 리뷰 이미지 배치가 이 경로를 참조합니다.

---

## 에이전트 온보딩

저장소만 넘겨받은 에이전트가 스스로 환경을 갖추고 실행까지 갈 수 있도록 만들어 두었습니다. 사람이 곁에서 설명해 줄 필요가 없습니다.

### 넘겨줄 때 이렇게 말하면 됩니다

```
이 저장소 실행할 수 있게 환경 세팅해줘.
README의 "에이전트 온보딩" 절차대로 하고, 필요한 값은 나한테 물어봐.
```

### 에이전트가 따라야 할 절차

**1. 맥락 잡기**

`AGENT.md`를 읽습니다. 제약, 브랜드 카피 규칙, 실행 규칙이 있습니다. 그다음 `docs/repo-map.json`으로 저장소 구조를 파악합니다.

**2. 런타임 설치**

```bash
pnpm install
```

```bash
pnpm exec playwright install chromium
```

**3. 무엇이 빠졌는지 확인**

```bash
pnpm setup:check
```

런타임, 환경변수, 데이터 파일을 점검해 `ok` / `warn` / `FAIL`로 표시하고, 실패한 항목마다 해결 명령을 알려줍니다. 종료 코드는 실패가 있으면 1입니다.

특정 작업만 쓸 거라면 범위를 좁힙니다. `account`, `review`, `qna`, `sheet` 중에서 고릅니다.

```bash
pnpm setup:check --task=review,sheet
```

**4. 사용자에게 물어볼 문항 뽑기**

```bash
pnpm setup:ask
```

필요한 값과 각각의 용도, 어디서 구하는지가 출력됩니다. 이 목록을 그대로 사용자에게 물어보면 됩니다. 작업 범위를 좁히면 문항도 줄어듭니다.

```bash
node scripts/check-setup/index.ts --ask --task=qna
```

**5. 받은 값을 `.env`에 채우기**

```bash
cp .env.example .env
```

비밀번호와 API 키는 사용자가 직접 `.env`에 넣게 하는 것을 원칙으로 합니다. 에이전트는 어떤 키에 무엇을 넣어야 하는지 안내하고, 채워졌는지만 확인합니다.

**6. 준비됐는지 다시 확인**

```bash
pnpm setup:check
```

`실행 준비가 끝났습니다.`가 나오면 다음으로 넘어갑니다. 아직 `FAIL`이 있으면 출력된 "다음에 할 일"을 처리하고 다시 돌립니다.

**7. 실행**

사용자가 원하는 작업에 맞는 명령을 고릅니다.

| 하고 싶은 것 | 명령 |
| --- | --- |
| 계정 하나 만들고 구매까지 | `pnpm tsx run-daily-pipeline.ts` |
| 계정 3개 만들고 구매까지 | `pnpm tsx run-daily-pipeline.ts 3` |
| 기존 계정으로 구매만 | `pnpm tsx run-daily-pipeline.ts <계정ID>` |
| 리뷰 작성 배치 | `BATCH_SIZE=20 pnpm tsx run-review-batch.ts` |
| 기존 리뷰에 이미지 첨부 | `pnpm tsx run-review-image-batch.ts` |
| 문의 등록 | `BATCH_SIZE=10 pnpm tsx run-qna-batch.ts` |
| 문의에 관리자 답변 | `pnpm tsx run-qna-reply-batch.ts` |
| 화면 보면서 조작 | `pnpm dev` 후 `http://localhost:5522` |

각 명령의 자세한 설명은 [CLI 스크립트로 실행하기](#cli-스크립트로-실행하기)에 있습니다.

### 물어봐야 할 값

`pnpm setup:ask`가 출력하는 것과 같습니다. 미리 알아두려면 아래를 참고하세요.

| 키 | 무엇을 묻는가 | 필요한 작업 | 어디서 구하는가 |
| --- | --- | --- | --- |
| `CAFE24_ADMIN_PASSWORD` | 쇼핑몰 관리자 비밀번호 | 문의 답변 | Cafe24 관리자 계정 |
| `REVIEW_ACCOUNT_PASSWORD` | 신규 계정에 쓸 공용 비밀번호 | 계정 생성, 리뷰 | 사용자가 정하는 값 |
| `REVIEW_ACCOUNT_PASSWORD_LEGACY` | 기존 계정들의 공용 비밀번호 | 리뷰, 문의 | 예전에 만든 계정의 비밀번호. 없으면 신규와 같은 값 |
| `ORDER_CONTACT_PHONE` | 주문서 수취인 연락처 | 계정 생성, 구매 | 사용자 연락처 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 서비스 계정 이메일 | 시트 기록 | GCP 서비스 계정 JSON의 `client_email` |
| `GOOGLE_PRIVATE_KEY` | 서비스 계정 개인키 | 시트 기록 | 같은 JSON의 `private_key`. 줄바꿈은 `\n`으로 |
| `GOOGLE_SHEET_ID` | 스프레드시트 ID | 시트 기록 | 시트 URL의 `/d/`와 `/edit` 사이 |
| `CAFE24_MALL_ID` | 쇼핑몰 ID (선택) | 문의 답변 | 비워 두면 `hanryeodamwon` |
| `CAPTCHA_API_KEY` | 2captcha API 키 (선택) | 문의 등록 | 캡차가 뜰 때만 필요 |

구글 서비스 계정을 처음 만든다면 순서는 이렇습니다. GCP 콘솔에서 서비스 계정을 만들고 → JSON 키를 발급받고 → 그 계정 이메일을 대상 스프레드시트에 편집자로 공유합니다. 공유를 빼먹으면 인증은 되는데 권한 오류가 납니다.

### 실행 전에 알아야 할 것

- 실행 계열 스크립트는 **실제 쇼핑몰에 회원가입과 주문을 발생시킵니다.** 동작만 확인할 목적으로 돌리지 않습니다.
- 화면을 보면서 확인하려면 `HEADLESS=false`로 두고, 백그라운드로 돌리려면 `HEADLESS=true`로 둡니다.
- 배송지는 한 번 정하면 바꾸지 않습니다. 자세한 내용은 [운영 규칙](#운영-규칙)에 있습니다.

### 코드를 고칠 때

- 비밀번호나 연락처를 코드에 직접 쓰지 않고 `src/shared/config`에서 가져옵니다.
- 새 스크립트에는 파일 상단에 블록 주석으로 설명과 `Usage:`를 답니다. 파서가 이 주석을 읽어 문서를 채웁니다.

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

- 구조가 바뀌면 문서를 다시 생성합니다. `docs/REPOSITORY.md`와 `docs/repo-map.json`은 손으로 고치지 않습니다.

```bash
pnpm repo:parse
```

- 커밋 전에 자격증명이 섞이지 않았는지 확인합니다.

```bash
pnpm repo:check
```


## 운영 규칙

`AGENT.md`에 판단 기준이 정리되어 있습니다. 자주 걸리는 항목만 옮깁니다.

### 브랜드 카피

- 인사말은 `안녕하세요 한려담원입니다.`로 시작합니다.
- 맺음말에 `감사합니다.`를 포함합니다.
- `안전하다`, `문제없다` 같은 단정적 표현과 질병 치료 효능 주장을 쓰지 않습니다.
- 건강, 복약, 임신, 소아, 고령 관련 문의에는 개인차 문구와 함께 `담당 의사 선생님과 상의`를 권합니다.

### 제품 사실

검증 가능한 범위에서만 씁니다.

- 지리산 8만평 규모 자연방목 국내산 흑염소
- 흑염소 원물 11%
- 1포 90mL
- 105℃ 48시간 저온 추출, 기름 제거 공정으로 잡내를 줄임
- 파우치를 전자레인지에 직접 넣지 않고 컵에 옮기거나 중탕

### 배송지

한 번 지정한 배송지는 바꾸지 않습니다. 시트에 적힌 배송지와 실제 주문 배송지가 같아야 합니다. 후보 목록은 `run-daily-pipeline.ts`의 `ADDRESS_POOL`에 있습니다.

### 리뷰 매칭

리뷰를 찾을 때는 제목이 아니라 이름 첫 글자(성씨)로 거릅니다. 저장된 `review.title`은 새로 쓸 리뷰의 제목이라 실제 등록된 리뷰 제목과 다릅니다.

---

## 트러블슈팅

### `pnpm tsx` 없이 `node`로 실행하면 모듈을 못 찾습니다

대부분의 스크립트가 상대 경로 import에 확장자를 붙이지 않았습니다. `pnpm tsx`로 실행하세요. `scripts/repo-parser/`만 예외적으로 확장자를 붙여 두어 `node`로 바로 돌아갑니다.

### 환경변수가 없다는 에러가 납니다

```
CAFE24_ADMIN_PASSWORD 환경변수가 없습니다. .env.example을 복사해 .env를 채운 뒤 다시 실행하세요.
```

`src/shared/config`가 필수 값이 비어 있을 때 던지는 에러입니다. 무엇이 빠졌는지 한 번에 보려면 아래를 돌립니다.

```bash
pnpm setup:check
```

### 리뷰 이미지 업로드가 실패합니다

원본 jpg는 3~4.5MB라 업로드가 막힙니다. webp로 변환한 뒤 다시 시도하세요.

```bash
pnpm tsx scripts/convert-review-images-to-webp.ts
```

업로드는 세 단계로 시도합니다. Froala 에디터 API → 합성 paste 이벤트 → 클립보드 단축키 순입니다. 셋 다 실패하면 에디터 구조가 바뀐 것이므로 셀렉터를 다시 확인해야 합니다.

### 리뷰 페이지로 바로 이동하면 동작하지 않습니다

리뷰 작업은 상품 페이지의 리뷰 탭에서만 합니다. URL로 직접 이동하지 말고 링크를 클릭해 이동하세요.

### 쇼핑몰 화면이 바뀌어 셀렉터가 깨졌습니다

각 액션은 `src/features/*/lib/` 아래에 모여 있습니다. 해당 파일의 셀렉터만 고치면 이를 쓰는 모든 스크립트에 반영됩니다.

### 커밋 전에 자격증명이 섞였는지 확인하고 싶습니다

```bash
pnpm repo:check
```

비밀번호나 API 키가 코드에 남아 있으면 종료 코드 1로 실패합니다.
