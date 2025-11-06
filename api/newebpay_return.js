import crypto from "crypto";
import querystring from "querystring";

// 🔧 關閉自動 body parser，手動處理 x-www-form-urlencoded
export const config = {
  api: {
    bodyParser: false,
  },
};

// 🔐 解密函式
function createSesDecrypt(TradeInfo) {
  const decrypt = crypto.createDecipheriv("aes-256-cbc", process.env.HASHKEY, process.env.HASHIV);
  decrypt.setAutoPadding(false);
  const text = decrypt.update(TradeInfo, "hex", "utf8");
  const plainText = text + decrypt.final("utf8");
  const resultText = plainText.replace(/[\x00-\x20]+/g, "");

  try {
    return JSON.parse(resultText.trim());
  } catch (e) {
    console.error("❌ JSON parse 失敗，原始字串：", resultText);
    throw e;
  }
}

// 🎯 主 handler
export default async function handler(req, res) {
  try {
    // 讀取原始 form data
    let rawBody = "";
    await new Promise((resolve, reject) => {
      req.on("data", (chunk) => (rawBody += chunk));
      req.on("end", resolve);
      req.on("error", reject);
    });

    // 將 body 解析為物件
    const body = querystring.parse(rawBody);

    if (!body.TradeInfo) {
      console.warn("⚠️ 未收到 TradeInfo，body:", body);
      return res.status(400).send("<h2>TradeInfo 不存在</h2>");
    }

    const data = createSesDecrypt(body.TradeInfo);
    console.log("✅ 交易成功解密：", data);

    // 顯示付款成功畫面
    res.status(200).send(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>交易成功</title>
          <style>
            body { text-align:center; font-family:sans-serif; padding-top:80px; background:#fafafa; }
            h2 { color:#2c7a7b; }
            a { display:inline-block; margin-top:20px; color:#3182ce; text-decoration:none; }
          </style>
        </head>
        <body>
          <h2>付款成功 🎉</h2>
          <p>訂單編號：${data.Result?.MerchantOrderNo || "(未知)"}</p>
          <a href="/">返回首頁</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ Return 解密或處理錯誤：", err);
    res.status(500).send("<h2>解密失敗，請稍後再試</h2>");
  }
}
