# 저장소 구조 맵
`scripts/repo-parser`가 생성한 문서입니다. 직접 수정하지 말고 `pnpm repo:parse`로 다시 생성하세요.
## 요약
- 추적 파일: 175개
- 실행 진입점: 44개
- 기능 슬라이스: 8개
- API 라우트: 3개
- 환경변수: 21개
- 자격증명 잔존 파일: 1개 (그중 high 심각도 0개)
## package.json 스크립트
| 명령 | 내용 |
| --- | --- |
| `pnpm dev` | `next dev --port 5522` |
| `pnpm build` | `next build` |
| `pnpm start` | `next start` |
| `pnpm lint` | `eslint` |
| `pnpm sheet:review-highlight` | `node scripts/setup-review-written-highlight.ts` |
| `pnpm repo:parse` | `node scripts/repo-parser/index.ts` |
| `pnpm repo:check` | `node scripts/repo-parser/index.ts --check` |
| `pnpm setup:check` | `node scripts/check-setup/index.ts` |
| `pnpm setup:ask` | `node scripts/check-setup/index.ts --ask` |
## 실행 진입점
진입점은 `pnpm tsx <파일>`로 실행합니다. 상대 경로 import에 확장자가 없어 순수 `node`로는 실행되지 않습니다.
### 루트 실행 스크립트

| 파일 | 설명 | 환경변수 |
| --- | --- | --- |
| `check-qna-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `check-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `create-qna-tab.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `read-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `run-batch-custom.ts` | (설명 주석 없음) | `HEADLESS` |
| `run-batch.ts` | (설명 주석 없음) | `HEADLESS` |
| `run-daily-pipeline.ts` | 한려담원 일일 파이프라인 계정 생성 → 구매 → 구글 시트 기록 | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `run-join-3.ts` | (설명 주석 없음) | - |
| `run-purchase-and-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `run-purchase-only.ts` | (설명 주석 없음) | `HEADLESS` |
| `run-qna-batch.ts` | (설명 주석 없음) | `BATCH_SIZE`, `CAPTCHA_API_KEY`, `HEADLESS` 외 2 |
| `run-qna-reply-batch.ts` | (설명 주석 없음) | - |
| `run-qna-write-and-reply.ts` | (설명 주석 없음) | `CAPTCHA_API_KEY` |
| `run-review-batch.ts` | (설명 주석 없음) | `BATCH_SIZE`, `HEADLESS`, `MAX_DELAY` 외 2 |
| `run-review-image-batch.ts` | (설명 주석 없음) | - |
| `update-sheet-addr.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `write-new-review.ts` | (설명 주석 없음) | - |

### scripts/ 보조 스크립트

| 파일 | 설명 | 환경변수 |
| --- | --- | --- |
| `scripts/check-news-refs.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `scripts/check-qna-html.ts` | (설명 주석 없음) | - |
| `scripts/check-review-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `scripts/check-setup/index.ts` | 환경 점검 실행에 필요한 런타임, 환경변수, 데이터 파일이 준비됐는지 확인하고 빠진 것마다 해결 방법을 알려준다. | - |
| `scripts/check-sheet.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `scripts/convert-review-images-to-webp.ts` | (설명 주석 없음) | `DRY_RUN`, `IMAGE_DIRS`, `MAX_SIZE` 외 4 |
| `scripts/crawl-chundamon-reviews.ts` | (설명 주석 없음) | - |
| `scripts/crawl-qna-from-brand.ts` | (설명 주석 없음) | - |
| `scripts/crawl-qna-questions.ts` | (설명 주석 없음) | - |
| `scripts/export-mall-reviews.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `scripts/export-reviews-batch.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `scripts/export-reviews.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `scripts/generate-qna-replies.ts` | (설명 주석 없음) | - |
| `scripts/generate-qna.ts` | (설명 주석 없음) | - |
| `scripts/generate-reviews.ts` | (설명 주석 없음) | - |
| `scripts/reconcile-review-index-by-name.ts` | (설명 주석 없음) | `HEADLESS`, `REVIEW_LIMIT`, `REVIEW_PAGE_LIMIT` 외 1 |
| `scripts/repo-parser/index.ts` | 저장소 파서 추적 중인 파일을 훑어 실행 진입점, 기능 슬라이스, API 라우트, 환경변수, 하드코딩된 자격증명을 뽑아 문서와 기계 판독용 맵으로 만든다. | - |
| `scripts/run-review-scheduler.ts` | (설명 주석 없음) | - |
| `scripts/scan-all-qna.ts` | (설명 주석 없음) | - |
| `scripts/scan-product-reviews.ts` | (설명 주석 없음) | - |
| `scripts/scan-qna-detail.ts` | (설명 주석 없음) | - |
| `scripts/scan-review-accounts.ts` | (설명 주석 없음) | - |
| `scripts/scrape-news-board.ts` | (설명 주석 없음) | - |
| `scripts/scrape-news-full.ts` | (설명 주석 없음) | - |
| `scripts/scrape-product-images.ts` | (설명 주석 없음) | - |
| `scripts/setup-review-written-highlight.ts` | (설명 주석 없음) | `GOOGLE_PRIVATE_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEET_ID` |
| `scripts/verify-review-images.ts` | (설명 주석 없음) | - |

### 사용법이 명시된 스크립트

#### `run-daily-pipeline.ts`
한려담원 일일 파이프라인 계정 생성 → 구매 → 구글 시트 기록
```bash
npx tsx run-daily-pipeline.ts              # 1개 신규 계정
npx tsx run-daily-pipeline.ts 3            # 3개 신규 계정
npx tsx run-daily-pipeline.ts jiyoung4433  # 기존 계정 구매
```
#### `scripts/check-setup/index.ts`
환경 점검 실행에 필요한 런타임, 환경변수, 데이터 파일이 준비됐는지 확인하고 빠진 것마다 해결 방법을 알려준다.
```bash
node scripts/check-setup/index.ts                  # 전체 점검
node scripts/check-setup/index.ts --task=review    # 특정 작업에 필요한 것만
node scripts/check-setup/index.ts --ask            # 사용자에게 물어볼 문항 출력
```
#### `scripts/repo-parser/index.ts`
저장소 파서 추적 중인 파일을 훑어 실행 진입점, 기능 슬라이스, API 라우트, 환경변수, 하드코딩된 자격증명을 뽑아 문서와 기계 판독용 맵으로 만든다.
```bash
node scripts/repo-parser/index.ts                 # docs/REPOSITORY.md + docs/repo-map.json 생성
node scripts/repo-parser/index.ts --stdout        # 파일을 쓰지 않고 마크다운만 출력
node scripts/repo-parser/index.ts --check         # 자격증명이 남아 있으면 종료코드 1
node scripts/repo-parser/index.ts --json out.json # 출력 경로 지정
```

## 기능 슬라이스 (src/features)

### `auth`

- `lib/` (3개 파일) — `adminLoginAction`, `loginAction`

### `browser`

- `lib/` (2개 파일) — `endSession`, `startSession`

### `join`

- `lib/` (6개 파일) — `ReviewRef`, `StoredAccount`, `agreeAction`, `findAccountIdByReviewNo`, `generateAccount`, `generateEmail`, `generateGender`, `generateId` 외 13
- `ui/` (4개 파일) — `AccountTable`, `JoinPanel`, `LogViewer`

### `order`

- `lib/` (3개 파일) — `clickBuyAction`, `placeOrderAction`

### `pipeline`

- `hooks/` (4개 파일) — `StoredAccount`, `filterAccountsBySteps`, `useAccounts`, `usePipelineBuilder`, `usePipelineRunner`
- `lib/` (3개 파일) — `ALL_STEPS`, `PRESETS`, `PipelineRequirements`, `Preset`, `STEP_METADATA`, `StepId`, `StepMeta`, `calculateRequirements`
- `ui/` (6개 파일) — `AccountSelector`, `PipelineBuilder`, `PipelineSettings`, `StepChip`, `StepFlow`

### `product`

- `lib/` (2개 파일) — `visitProductAction`

### `qna`

- `lib/` (3개 파일) — `ReplyType`, `getReplyForQuestion`, `getReplyTypeForQuestion`, `writeQnaAction`, `writeQnaReplyAction`

### `review`

- `lib/` (2개 파일) — `writeReviewAction`

## API 라우트

| 경로 | 메서드 | 파일 |
| --- | --- | --- |
| `/api/accounts` | GET | `src/app/api/accounts/route.ts` |
| `/api/join` | GET | `src/app/api/join/route.ts` |
| `/api/pipeline` | POST | `src/app/api/pipeline/route.ts` |

## 환경변수

| 키 | 사용 파일 수 | 대표 사용처 |
| --- | --- | --- |
| `BATCH_SIZE` | 2 | `run-qna-batch.ts` |
| `CAFE24_MALL_ID` | 1 | `src/shared/config/credentials.ts` |
| `CAPTCHA_API_KEY` | 2 | `run-qna-batch.ts` |
| `DRY_RUN` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `GOOGLE_PRIVATE_KEY` | 14 | `check-qna-sheet.ts` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 14 | `check-qna-sheet.ts` |
| `GOOGLE_SHEET_ID` | 7 | `check-sheet.ts` |
| `HEADLESS` | 7 | `run-batch-custom.ts` |
| `IMAGE_DIRS` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `MAX_DELAY` | 2 | `run-qna-batch.ts` |
| `MAX_SIZE` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `MIN_DELAY` | 2 | `run-qna-batch.ts` |
| `ONLY_NUMBERED` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `OVERWRITE` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `PLAYWRIGHT_BROWSERS_PATH` | 1 | `scripts/check-setup/check-runtime.ts` |
| `QUALITY` | 1 | `scripts/convert-review-images-to-webp.ts` |
| `REVIEW_LIMIT` | 1 | `scripts/reconcile-review-index-by-name.ts` |
| `REVIEW_PAGE_LIMIT` | 1 | `scripts/reconcile-review-index-by-name.ts` |
| `TARGET_NAME_PREFIX` | 1 | `scripts/reconcile-review-index-by-name.ts` |
| `TARGET_SUCCESS` | 1 | `run-review-batch.ts` |
| `VERBOSE` | 1 | `scripts/convert-review-images-to-webp.ts` |

## 자격증명 점검

하드코딩된 값이 남아 있는 파일 1개입니다. 값은 마스킹되어 기록됩니다.

`high`(비밀번호, API 키)만 `pnpm repo:check` 실패로 처리합니다. `low`는 배송지 풀 같은 운영 데이터라 정상입니다.

| 파일 | 심각도 | 탐지 건수 | 종류 |
| --- | --- | --- | --- |
| `run-daily-pipeline.ts` | low | 7 | address |

