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

const main = async () => {
  const info = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = info.data.sheets?.map((s) => s.properties?.title) ?? [];
  console.log("현재 탭:", tabs);

  if (!tabs.includes("계정 QNA")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "계정 QNA" } } }],
      },
    });
    console.log("계정 QNA 탭 생성 완료");
  } else {
    console.log("계정 QNA 탭 이미 존재");
  }
};

main();
