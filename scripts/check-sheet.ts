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
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "가구매 리뷰 계정!A1:D1000",
  });
  const rows = res.data.values ?? [];
  rows.forEach((r, i) => console.log(`[${i}] ${r.join(" | ")}`));
  console.log(`\n총 ${rows.length - 1}개 데이터`);
};

run().catch(console.error);
