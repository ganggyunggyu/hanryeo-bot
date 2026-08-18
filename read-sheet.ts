import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

const run = async () => {
  // 시트 목록
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  console.log("=== 시트 목록 ===");
  meta.data.sheets?.forEach((s) => {
    console.log(`  - ${s.properties?.title} (gid: ${s.properties?.sheetId})`);
  });

  // gid=287746816에 해당하는 시트 찾기
  const targetSheet = meta.data.sheets?.find((s) => s.properties?.sheetId === 287746816);
  const sheetName = targetSheet?.properties?.title ?? "리뷰";
  console.log(`\n타겟 시트: ${sheetName}`);

  // 헤더 + 처음 5행 읽기
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:Z10`,
  });

  console.log("\n=== 데이터 (A1:Z10) ===");
  res.data.values?.forEach((row, i) => {
    console.log(`  [${i}] ${JSON.stringify(row)}`);
  });
};

run().catch(console.error);
