import crypto from "crypto";

function createSesDecrypt(TradeInfo) {
  const decrypt = crypto.createDecipheriv("aes256", process.env.HASHKEY, process.env.HASHIV);
  decrypt.setAutoPadding(false);
  const text = decrypt.update(TradeInfo, "hex", "utf8");
  const plainText = text + decrypt.final("utf8");
  const result = plainText.replace(/[\x00-\x20]+/g, "");
  return JSON.parse(result);
}

export default async function handler(req, res) {
  const data = createSesDecrypt(req.body.TradeInfo);
  res.status(200).send(`<h2>交易成功！訂單編號：${data.Result.MerchantOrderNo}</h2>`);
}
