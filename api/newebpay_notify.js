import { handleNotify } from "../lib/newebpayHandler.js";
import querystring from "querystring";

// ✅ 確保 Vercel 接受原始 body（不自動轉 JSON）
export const config = {
  api: {
    bodyParser: false, // ❗ 關閉內建 parser 才能自己處理 form-urlencoded
  },
};

export default async function handler(req, res) {
  try {
    // 讀取原始請求資料（藍新回傳是 x-www-form-urlencoded）
    let rawBody = "";

    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        rawBody += chunk;
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    // 🔍 將 body 轉成物件
    const body = querystring.parse(rawBody);

    if (!body.TradeInfo) {
      console.warn("⚠️ 未收到 TradeInfo，body:", body);
      return res.status(400).send("Missing TradeInfo");
    }

    console.log("📩 Notify 接收資料:", body);
    const data = handleNotify(body);

    console.log("✅ Notify 解密成功：", data.Result?.MerchantOrderNo);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Notify 處理錯誤:", err);
    return res.status(400).send("Error");
  }
}
