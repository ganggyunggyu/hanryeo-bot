import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const main = async () => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: "1gyipTIEogC9Qopj8w3ggBmD0k5KvAw6yNdIMXQDnwms",
    range: "계정 QNA!A1:G20",
  });
  const rows = res.data.values ?? [];
  rows.forEach((row, i) => {
    const reply = row[5] ?? "";
    console.log(`[${i}] ${row[0]} | ${row[3]} | 답변(${reply.length}자): ${reply.slice(0, 120)}...`);
  });
};

main();
