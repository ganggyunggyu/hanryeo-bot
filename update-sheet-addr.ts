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
const SHEET_NAME = "리뷰 계정";

const ALL_ACCOUNTS = [
  { name: "강지영", id: "namu2972", fullAddr: "서울특별시 성북구 동소문로20길 37 3층" },
  { name: "서영숙", id: "jiyoung4433", fullAddr: "경기도 수원시 장안구 정조로 900 104동 903호" },
  { name: "정태호", id: "goodday9774", fullAddr: "부산광역시 동래구 명륜로98번길 11 2층 202호" },
];

const run = async () => {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:Z1000`,
  });

  const header = ["수취인", "참여ID", "배송지", "구매일시"];
  const rows = ALL_ACCOUNTS.map((acc) => [acc.name, acc.id, acc.fullAddr, ""]);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [header, ...rows] },
  });

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:D5`,
  });
  console.log("시트 업데이트 완료:");
  check.data.values?.forEach((row, i) => console.log(`  [${i}] ${row.join(" | ")}`));
};

run().catch(console.error);
