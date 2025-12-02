import crypto from "crypto";
import querystring from "querystring";

// 🔧 關閉自動 body parser，手動處理 x-www-form-urlencoded

export const config = {
  api: {
    bodyParser: false,
  },
};

// 🔐 解密函式
// crypto.createDecipheriv("aes-256-cbc", HASHKEY, HASHIV)
// → 用藍新文件指定的演算法：AES-256-CBC
// → 用你 .env 裡的 HASHKEY / HASHIV 當 key 和 iv

// decrypt.setAutoPadding(false);
// → 關閉自動 padding，因為藍新自己有特別的 padding 處理方式
// → 後面要自己 replace 掉那些無用的字元

// decrypt.update(TradeInfo, "hex", "utf8");
// → TradeInfo 是「十六進位字串」
// → 這裡把它解成 utf8 的原始字串（例如 {"Status":"SUCCESS","Result":...}）

// plainText = text + decrypt.final("utf8");
// → 把剩餘的解密資料補完

// plainText.replace(/[\x00-\x20]+/g, "")
// → 把 padding 出來的控制字元（0x00–0x20）全部去掉
// → 才能變成乾淨的 JSON 字串

// JSON.parse(resultText.trim())
// → 把 JSON 字串轉回 JavaScript 物件

// 如果 parse 失敗 → 印出原始字串，幫助 debug。

// 這就是「官方文件 21–22 頁的 AES 解密流程」的 JS 實作版。
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

    // rawBody：先準備一個空字串
    // req.on("data", ...)：一包一包接收資料、累加到 rawBody
    // req.on("end", ...)：收完了，Promise resolve
    // 最後 querystring.parse(rawBody) 把它變成物件：
    // 假設 rawBody 長這樣：
    // Status=SUCCESS&TradeInfo=3f8abc...&TradeSha=ABCD1234...

    // parse 完會變：

    // {
    //   Status: "SUCCESS",
    //   TradeInfo: "3f8abc...",
    //   TradeSha: "ABCD1234..."
    // }

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
