import crypto from "crypto";

const { HASHKEY, HASHIV } = process.env;

export function createSesDecrypt(TradeInfo) {
  const decrypt = crypto.createDecipheriv("aes256", HASHKEY, HASHIV);
  decrypt.setAutoPadding(false);
  const text = decrypt.update(TradeInfo, "hex", "utf8");
  const plainText = text + decrypt.final("utf8");
  const result = plainText.replace(/[\x00-\x20]+/g, "");
  return JSON.parse(result);
}

export function createShaEncrypt(aesEncrypt) {
  const sha = crypto.createHash("sha256");
  const plainText = `HashKey=${HASHKEY}&${aesEncrypt}&HashIV=${HASHIV}`;
  return sha.update(plainText).digest("hex").toUpperCase();
}

// 核心處理邏輯（本地或雲端都共用）
export function handleNotify(response) {
  console.log("📩 Notify 接收資料", response);
  const data = createSesDecrypt(response.TradeInfo);
  console.log("🔓 解密後資料", data);

  const thisSha = createShaEncrypt(response.TradeInfo);
  if (thisSha !== response.TradeSha) {
    console.log("❌ SHA 驗證失敗");
    throw new Error("TradeSha mismatch");
  }

  console.log("✅ 付款完成：", data.Result.MerchantOrderNo);
  return data;
}
