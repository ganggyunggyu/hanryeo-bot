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
const SHEET_ID = "1gyipTIEogC9Qopj8w3ggBmD0k5KvAw6yNdIMXQDnwms";

const run = async () => {
  // 1. 한려담원 카페 원고 탭
  console.log("=== 한려담원 카페 원고 ===");
  const cafe = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "한려담원 카페 원고!A1:Z10",
  });
  const cafeRows = cafe.data.values ?? [];
  cafeRows.forEach((r, i) => console.log(`[${i}] ${r.map((c: string) => c?.slice(0, 60)).join(" | ")}`));

  // 2. 프롬프트 v1-v6 최종 탭
  console.log("\n=== 프롬프트 v1-v6 최종 ===");
  const prompt = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "프롬프트 v1-v6 최종!A1:Z10",
  });
  const promptRows = prompt.data.values ?? [];
  promptRows.forEach((r, i) => console.log(`[${i}] ${r.map((c: string) => c?.slice(0, 80)).join(" | ")}`));

  // 3. 계정 리뷰 샘플 탭
  console.log("\n=== 계정 리뷰 샘플 ===");
  const sample = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "계정 리뷰 샘플!A1:Z5",
  });
  const sampleRows = sample.data.values ?? [];
  sampleRows.forEach((r, i) => console.log(`[${i}] ${r.map((c: string) => c?.slice(0, 60)).join(" | ")}`));

  // 4. 한려담원 소식 게시판 기존 글 확인 (홈페이지)
  console.log("\n=== 한려담원 소식 기존 글 (시트 기준) ===");
  // 이건 시트에 없을 수 있으니 참고용
};

run().catch(console.error);
