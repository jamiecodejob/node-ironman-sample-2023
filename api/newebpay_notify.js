import { handleNotify } from "../lib/newebpayHandler.js";
import querystring from "querystring";

// 🔧 讓 Vercel 正確處理 x-www-form-urlencoded
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
      extended: true,
    },
  },
};

export default async function handler(req, res) {
  try {
    // 解析藍新回傳的資料
    let body = req.body;
    if (!body || !body.TradeInfo) {
      // 如果 Vercel 沒解析 JSON，手動轉換
      const raw =
        typeof req.body === "string"
          ? req.body
          : req.rawBody?.toString() || "";
      body = querystring.parse(raw);
    }

    if (!body.TradeInfo) {
      console.warn("⚠️ 未收到 TradeInfo，body:", body);
      return res.status(400).send("Missing TradeInfo");
    }

    console.log("📩 Notify 接收資料", body);
    const data = handleNotify(body);

    console.log("✅ Notify 解密成功：", data.Result?.MerchantOrderNo);
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Notify 處理錯誤:", err);
    res.status(400).send("Error");
  }
}
