---
description: 한려담원 소식 게시판 원고 작성 → 글 등록 자동화
argument-hint: "[숫자] 작성할 게시글 개수 (기본 1)"
---

# 한려담원 소식 게시글 작성

"한려담원 소식" 게시판(board_no=1)에 원고를 작성하고 자동 등록하는 파이프라인.

## 실행 방법

```
/write-news            # 1개 게시글 작성 + 등록
/write-news 3          # 3개 게시글 작성 + 등록
```

## 파이프라인 흐름

```
1. 원고 작성
   - 사용자 요청 또는 기본 주제로 원고 생성
   - 자연스러운 톤, 브랜드 소식/건강정보/시즌 콘텐츠

2. 어드민 로그인
   - Cafe24 어드민 로그인 (adminLoginAction)
   - mallId: "hanryeodamwon"

3. 글쓰기 페이지 접근
   - URL: https://hanryeodamwon.cafe24.com/board/free/write.html?board_no=1
   - ⚠️ 반드시 cafe24 서브도메인 사용 (관리자 권한)

4. 폼 입력
   - 제목: #subject 필드에 입력
   - 본문: Froala 에디터 (EC_FROALA_INSTANCE)에 HTML 입력
   - 파일첨부: 필요 시 attach_file[] (최대 5개)

5. 글 등록
   - BOARD_WRITE.form_submit('boardWriteForm') 호출
   - 등록 후 목록 페이지로 이동 확인
```

## 글쓰기 폼 상세

| 필드 | 셀렉터 | 용도 |
|------|--------|------|
| 제목 | `#subject` | 글 제목 (텍스트) |
| 본문 | Froala 에디터 (`EC_FROALA_INSTANCE`) | HTML 본문 |
| 공지 체크 | `#notice0` | 공지사항 여부 (체크박스) |
| 비공개 | `#secure0` (공개) / `#secure1` (비공개) | 공개 설정 |
| 파일첨부 | `input[name="attach_file[]"]` | 이미지/파일 (최대 5개) |
| 비밀번호 | `#password` | 글 비밀번호 (선택) |
| 등록 | `BOARD_WRITE.form_submit('boardWriteForm')` | 제출 함수 |

## Froala 에디터 본문 입력 방법

```typescript
// 방법 1: Froala API 직접 사용
await page.evaluate((html) => {
  const editor = (window as any).EC_FROALA_INSTANCE;
  if (editor) {
    editor.html.set(html);
  }
}, htmlContent);

// 방법 2: iframe contentDocument 직접 조작
const editorFrame = page.frame({ name: 'content_IFRAME' });
if (editorFrame) {
  await editorFrame.evaluate((html) => {
    document.body.innerHTML = html;
  }, htmlContent);
}
```

## 원고 작성

**원고 프롬프트: `prompts/news-article-v1.md`**

원고 작성 시 반드시 위 프롬프트 파일을 읽고 그 규칙에 따라 작성할 것.
글 유형, 톤 규칙, 금지 사항, HTML 구조, QA 체크리스트가 모두 정의되어 있음.

### 글 유형 요약

| 유형 | 설명 |
|------|------|
| 건강정보 | 특정 건강 주제 실용 정보 |
| 시즌콘텐츠 | 계절/명절 맞춤 콘텐츠 |
| 브랜드소식 | 이벤트, 공지 안내 |
| 건강상식 | 원료/보양 관련 상식 (면책 문구 필수) |
| 생활팁 | 일상 건강 관리 팁 |

톤, HTML 구조, 금지 사항, 분량 등 상세 규칙은 모두 `prompts/news-article-v1.md`에 정의되어 있음.

## 핵심 코드 패턴

```typescript
import { adminLoginAction } from "../src/features/auth/lib/admin-login-action";

const CAFE24_BASE = "https://hanryeodamwon.cafe24.com";
const WRITE_URL = `${CAFE24_BASE}/board/free/write.html?board_no=1`;

// 1. 어드민 로그인
await adminLoginAction(page, { mallId: ADMIN_MALL_ID, password: getAdminPassword() });

// 2. 글쓰기 페이지
await page.goto(WRITE_URL, { waitUntil: "domcontentloaded" });

// 3. 제목 입력
await page.fill("#subject", title);

// 4. Froala 본문 입력
await page.evaluate((html) => {
  const editor = (window as any).EC_FROALA_INSTANCE;
  if (editor) editor.html.set(html);
}, bodyHtml);

// 5. 등록
await page.evaluate(() => {
  (window as any).BOARD_WRITE.form_submit("boardWriteForm");
});
```

## 게시판 목록 (참고)

| 게시판 | board_no | 글쓰기 URL | 비고 |
|--------|----------|-----------|------|
| 한려담원 소식 | 1 | `/board/free/write.html?board_no=1` | **이 스킬 대상** |
| 이벤트 | 2 | `/board/free/write.html?board_no=2` | |
| 자유게시판 | 5 | `/board/free/write.html?board_no=5` | |
| 갤러리 | 8 | `/board/gallery/write.html?board_no=8` | |

## 주의사항

- **반드시 `hanryeodamwon.cafe24.com` 서브도메인** 사용 (hanryeodamwon.com은 로그인 리다이렉트됨)
- 어드민 로그인 후 쿠키가 cafe24 서브도메인에만 유효
- 등록 후 목록 페이지(`list.html?board_no=1`)로 이동하면 성공
- 등록 실패 시 write 페이지에 남아있음 → 에러 메시지 확인
- 이미지 첨부 시 `attach_file[]` input에 setInputFiles 사용
