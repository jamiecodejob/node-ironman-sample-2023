import crypto from "crypto";

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

export default async function handler(req, res) {
  try {
    if (!req.body || !req.body.TradeInfo) {
      return res.status(400).send("<h2>TradeInfo 不存在</h2>");
    }

    const data = createSesDecrypt(req.body.TradeInfo);
    console.log("✅ 交易成功解密：", data);

    res.status(200).send(`
      <html>
        <head><title>交易成功</title></head>
        <body style="text-align:center; font-family:sans-serif; padding-top:80px;">
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
