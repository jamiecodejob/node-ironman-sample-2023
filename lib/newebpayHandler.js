import crypto from "crypto";

const { HASHKEY, HASHIV } = process.env;
// - `crypto`：Node 內建加解密工具（AES、SHA256 全靠它）
// - `HASHKEY`, `HASHIV`：從 `.env` 拿藍新提供給你的 key/iv
    
//     👉 一定要是 **32 字元**（HASHKEY）跟 **16 字元**（HASHIV），而且不能多空白。

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
// 1. `createDecipheriv("aes-256-cbc", HASHKEY, HASHIV)`
//     → 用藍新指定的 AES-256-CBC + 你的 HASHKEY/HASHIV 去解密
// 2. `setAutoPadding(false)`
//     → 不用 crypto 自己的 padding，因為藍新有自己格式   
//     → 你後面用 `replace(/[\x00-\x20]+/g, "")` 把多餘控制字元清掉   
// 3. `decrypt.update(TradeInfo, "hex", "utf8")`
//     → `TradeInfo` 是 hex 字串（例如：`3a4f9c...`）  
//     → 這裡轉成 utf8 純文字（其實就是 JSON 字串）  
// 4. `plainText.replace(...)` 
//     → 把 padding 的 0x00–0x20 控制字元通通刪掉，避免 `JSON.parse` 爆炸
// 5. `JSON.parse(jsonText)`
//     → 最後變成 JS 物件，例如：
//     ```jsx
//     {
//       Status: "SUCCESS",
//       Result: {
//         MerchantOrderNo: "1733xxxxxx",
//         Amt: 100,
//         TradeNo: "...",
//         PayTime: "2025-12-02 10:20:30",
//         ...
//       }
//     } 
//     ```
// 如果：
// - AES 解失敗 → 外層 `catch` 印「❌ 解密失敗」
// - JSON.parse 失敗 → 內層印出「原始字串」方便你 debug


// ✅ 計算 SHA256
export function createShaEncrypt(aesEncrypt) {
  const sha = crypto.createHash("sha256");
  const plainText = `HashKey=${HASHKEY}&${aesEncrypt}&HashIV=${HASHIV}`;
  return sha.update(plainText).digest("hex").toUpperCase();
}
// 這個就是 **藍新文件 P18 的做法**：
// > HashKey=你的key&TradeInfo的hex字串&HashIV=你的iv
// >
// 然後整串丟進 SHA256 → 轉成 hex → 再轉大寫。
// 用途是：
// - 拿這個值跟藍新傳來的 `TradeSha` 比對
// - 如果 **你算出來的 thisSha 跟 response.TradeSha 一樣** → 代表資料沒被竄改


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
  // - 用你自己的 `createShaEncrypt` 算一遍 SHA256
  // - 跟藍新給的 `response.TradeSha` 比對
  // - 不相等 → 代表資料可能被改過、中途被干擾 → 直接 throw error
  // 👉 這一步是 **驗證完整性的關鍵**

  console.log("✅ 付款完成：", data.Result?.MerchantOrderNo || "(未知訂單號)");
  return data;
}
