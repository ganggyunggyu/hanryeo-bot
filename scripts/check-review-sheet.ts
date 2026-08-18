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
  // 탭 목록
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets.properties",
  });
  const allSheets = meta.data.sheets ?? [];
  console.log("=== 탭 목록 ===");
  allSheets.forEach((s) => {
    const p = s.properties!;
    console.log(`  gid=${p.sheetId} → "${p.title}"`);
  });

  // gid=1022853831 탭 데이터
  const target = allSheets.find((s) => s.properties!.sheetId === 1022853831);
  if (!target) {
    console.log("gid=1022853831 탭 없음");
    return;
  }
  const tabName = target.properties!.title!;
  console.log(`\n=== "${tabName}" 탭 데이터 ===`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:Z50`,
  });
  const rows = res.data.values ?? [];
  rows.forEach((r, i) => console.log(`[${i}] ${r.join(" | ")}`));
  console.log(`\n총 ${rows.length}행`);
};

run().catch(console.error);
