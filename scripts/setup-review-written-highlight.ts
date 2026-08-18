import { google, type sheets_v4 } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TARGET_SHEET_NAME = process.argv[2]?.trim();
const REVIEW_HEADER = "리뷰작성";
const PARTICIPANT_HEADER_CANDIDATES = new Set(["참여id", "참여아이디"]);
const REVIEW_HEADER_CANDIDATES = new Set([REVIEW_HEADER]);
const HIGHLIGHT_COLOR = { red: 0.82, green: 0.93, blue: 0.79 };

if (!SHEET_ID) {
  throw new Error("GOOGLE_SHEET_ID 환경변수가 없음");
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

type TargetSheet = {
  conditionalFormats: sheets_v4.Schema$ConditionalFormatRule[];
  participantColumnIndex: number;
  reviewColumnIndex: number;
  sheetId: number;
  title: string;
};

const normalizeHeader = (value: string) => value.replace(/\s+/g, "").toLowerCase();

const escapeSheetTitle = (value: string) => `'${value.replace(/'/g, "''")}'`;

const columnIndexToLetter = (columnIndex: number) => {
  let currentIndex = columnIndex + 1;
  let result = "";

  while (currentIndex > 0) {
    const remainder = (currentIndex - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    currentIndex = Math.floor((currentIndex - 1) / 26);
  }

  return result;
};

const getHeaderIndex = (headers: string[], candidates: Set<string>) =>
  headers.findIndex((header) => candidates.has(normalizeHeader(header)));

const getLastHeaderIndex = (headers: string[]) =>
  headers.reduce((lastIndex, header, index) => (header.trim() ? index : lastIndex), -1);

const getHeaders = async (title: string) => {
  const range = `${escapeSheetTitle(title)}!1:1`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });

  return (response.data.values?.[0] ?? []).map((value) => String(value ?? "").trim());
};

const appendReviewHeader = async (title: string, columnIndex: number) => {
  const cell = `${columnIndexToLetter(columnIndex)}1`;
  const range = `${escapeSheetTitle(title)}!${cell}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[REVIEW_HEADER]],
    },
  });
};

const buildFormula = (reviewColumnIndex: number) => {
  const reviewColumnLetter = columnIndexToLetter(reviewColumnIndex);
  return `=UPPER(TRIM(TO_TEXT($${reviewColumnLetter}2)))="O"`;
};

const isSameTargetColumn = (
  rule: sheets_v4.Schema$ConditionalFormatRule,
  participantColumnIndex: number,
  sheetId: number,
) =>
  (rule.ranges ?? []).some((range) =>
    range.sheetId === sheetId
    && range.startColumnIndex === participantColumnIndex
    && range.endColumnIndex === participantColumnIndex + 1
    && range.startRowIndex === 1
  );

const getExistingRuleIndexes = (
  conditionalFormats: sheets_v4.Schema$ConditionalFormatRule[],
  participantColumnIndex: number,
  reviewColumnIndex: number,
  sheetId: number,
) => {
  const normalizedFormula = normalizeHeader(buildFormula(reviewColumnIndex));

  return conditionalFormats.reduce<number[]>((indexes, rule, index) => {
    if (!isSameTargetColumn(rule, participantColumnIndex, sheetId)) {
      return indexes;
    }

    const condition = rule.booleanRule?.condition;
    const formula = condition?.values?.[0]?.userEnteredValue ?? "";

    if (condition?.type === "CUSTOM_FORMULA" && normalizeHeader(formula) === normalizedFormula) {
      indexes.push(index);
    }

    return indexes;
  }, []);
};

const getTargetSheets = async (): Promise<TargetSheet[]> => {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets(properties(sheetId,title),conditionalFormats(ranges(sheetId,startRowIndex,endRowIndex,startColumnIndex,endColumnIndex),booleanRule(condition(type,values(userEnteredValue)))))",
  });

  const availableSheets = (metadata.data.sheets ?? []).filter((sheet) => {
    const title = sheet.properties?.title?.trim();
    return TARGET_SHEET_NAME ? title === TARGET_SHEET_NAME : true;
  });

  if (TARGET_SHEET_NAME && availableSheets.length === 0) {
    throw new Error(`시트 탭을 찾지 못함: ${TARGET_SHEET_NAME}`);
  }

  const targets: TargetSheet[] = [];

  for (const sheet of availableSheets) {
    const sheetId = sheet.properties?.sheetId;
    const title = sheet.properties?.title?.trim();

    if (sheetId === undefined || !title) {
      continue;
    }

    const headers = await getHeaders(title);
    const participantColumnIndex = getHeaderIndex(headers, PARTICIPANT_HEADER_CANDIDATES);

    if (participantColumnIndex < 0) {
      if (TARGET_SHEET_NAME) {
        throw new Error(`참여ID/참여아이디 헤더를 찾지 못함: ${title}`);
      }
      continue;
    }

    let reviewColumnIndex = getHeaderIndex(headers, REVIEW_HEADER_CANDIDATES);

    if (reviewColumnIndex < 0) {
      reviewColumnIndex = getLastHeaderIndex(headers) + 1;
      await appendReviewHeader(title, reviewColumnIndex);
      console.log(`[${title}] ${columnIndexToLetter(reviewColumnIndex)}1에 리뷰작성 헤더 추가`);
    }

    targets.push({
      conditionalFormats: sheet.conditionalFormats ?? [],
      participantColumnIndex,
      reviewColumnIndex,
      sheetId,
      title,
    });
  }

  if (targets.length === 0) {
    throw new Error("참여ID/참여아이디 헤더가 있는 시트를 찾지 못함");
  }

  return targets;
};

const buildRequests = (target: TargetSheet): sheets_v4.Schema$Request[] => {
  const formula = buildFormula(target.reviewColumnIndex);
  const existingRuleIndexes = getExistingRuleIndexes(
    target.conditionalFormats,
    target.participantColumnIndex,
    target.reviewColumnIndex,
    target.sheetId,
  );

  const deleteRequests = existingRuleIndexes
    .sort((left, right) => right - left)
    .map((index) => ({
      deleteConditionalFormatRule: {
        index,
        sheetId: target.sheetId,
      },
    }));

  const addRequest: sheets_v4.Schema$Request = {
    addConditionalFormatRule: {
      index: 0,
      rule: {
        ranges: [
          {
            sheetId: target.sheetId,
            startColumnIndex: target.participantColumnIndex,
            endColumnIndex: target.participantColumnIndex + 1,
            startRowIndex: 1,
          },
        ],
        booleanRule: {
          condition: {
            type: "CUSTOM_FORMULA",
            values: [{ userEnteredValue: formula }],
          },
          format: {
            backgroundColor: HIGHLIGHT_COLOR,
            textFormat: {
              bold: true,
            },
          },
        },
      },
    },
  };

  return [...deleteRequests, addRequest];
};

const run = async () => {
  const targets = await getTargetSheets();
  const requests = targets.flatMap((target) => buildRequests(target));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  targets.forEach((target) => {
    const participantColumnLetter = columnIndexToLetter(target.participantColumnIndex);
    const reviewColumnLetter = columnIndexToLetter(target.reviewColumnIndex);

    console.log(
      `[${target.title}] ${participantColumnLetter}열 참여아이디 하이라이트 연결 완료 (기준: ${reviewColumnLetter}열 리뷰작성 = O)`,
    );
  });
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`실패: ${message}`);
  process.exit(1);
});
