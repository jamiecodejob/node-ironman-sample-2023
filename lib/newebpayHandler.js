import crypto from "crypto";

const { HASHKEY, HASHIV } = process.env;

// ✅ 解密 TradeInfo
export function createSesDecrypt(TradeInfo) {
  try {
    const decrypt = crypto.createDecipheriv("aes-256-cbc", HASHKEY, HASHIV);
    decrypt.setAutoPadding(false);
    const text = decrypt.update(TradeInfo, "hex", "utf8");
    const plainText = text + decrypt.final("utf8");
    const result = plainText.replace(/[\x00-\x20]+/g, "");

    let jsonText = result.trim();
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("❌ JSON parse 失敗，原始字串：", jsonText);
      throw e;
    }
  } catch (err) {
    console.error("❌ 解密失敗:", err);
    throw err;
  }
}

// ✅ 計算 SHA256
export function createShaEncrypt(aesEncrypt) {
  const sha = crypto.createHash("sha256");
  const plainText = `HashKey=${HASHKEY}&${aesEncrypt}&HashIV=${HASHIV}`;
  return sha.update(plainText).digest("hex").toUpperCase();
}

// ✅ 處理 Notify 回呼
export function handleNotify(response) {
  console.log("📩 Notify 接收資料", response);

  const data = createSesDecrypt(response.TradeInfo);
  console.log("🔓 解密後資料", data);

  const thisSha = createShaEncrypt(response.TradeInfo);
  if (thisSha !== response.TradeSha) {
    console.log("❌ SHA 驗證失敗");
    throw new Error("TradeSha mismatch");
  }

  console.log("✅ 付款完成：", data.Result?.MerchantOrderNo || "(未知訂單號)");
  return data;
}
