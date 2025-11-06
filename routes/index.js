console.log('✅ routes/index.js 已載入');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
if (!process.env.VERCEL) {
  require('dotenv').config();
}
const orders = {};

console.log('🔍 DEBUG ENV CHECK');
console.log('MerchantID:', process.env.MerchantID);
console.log('HASHKEY:', process.env.HASHKEY ? '✅ loaded' : '❌ missing');
console.log('HASHIV:', process.env.HASHIV ? '✅ loaded' : '❌ missing');

const {
  MerchantID,
  HASHKEY,
  HASHIV,
  Version,
  PayGateWay,
  NotifyUrl,
  ReturnUrl,
} = process.env;
const RespondType = 'JSON';

// 建立訂單
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
router.post('/createOrder', (req, res) => {
  const data = req.body;
  console.log(data);

  // 使用 Unix Timestamp 作為訂單編號（金流也需要加入時間戳記）
  const TimeStamp = Math.round(new Date().getTime() / 1000);
  const order = {
    ...data,
    TimeStamp,
    Amt: parseInt(data.Amt),
    MerchantOrderNo: TimeStamp,
  };

  // 進行訂單加密
  // 加密第一段字串，此段主要是提供交易內容給予藍新金流
  const aesEncrypt = createSesEncrypt(order);
  console.log('aesEncrypt:', aesEncrypt);

  // 使用 HASH 再次 SHA 加密字串，作為驗證使用
  const shaEncrypt = createShaEncrypt(aesEncrypt);
  console.log('shaEncrypt:', shaEncrypt);
  order.aesEncrypt = aesEncrypt;
  order.shaEncrypt = shaEncrypt;

  orders[TimeStamp] = order;
  console.log(orders[TimeStamp]);

  res.redirect(`/check/${TimeStamp}`);
});

router.get('/check/:id', (req, res, next) => {
  const { id } = req.params;
  const order = orders[id];
  console.log(order);
  res.render('check', {
    title: 'Express',
    PayGateWay,
    Version,
    order,
    MerchantID,
    NotifyUrl,
    ReturnUrl,
  });
});
const { handleNotify } = require("../lib/newebpayHandler.js");
router.post("/newebpay_notify", (req, res) => {
  try {
    const data = handleNotify(req.body);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(400).send("Error");
  }
});

router.post("/newebpay_return", (req, res) => {
  res.render("success", { title: "交易成功" });
});

// 字串組合
function genDataChain(order) {
  return `MerchantID=${MerchantID}&TimeStamp=${
    order.TimeStamp
  }&Version=${Version}&RespondType=${RespondType}&MerchantOrderNo=${
    order.MerchantOrderNo
  }&Amt=${order.Amt}&NotifyURL=${encodeURIComponent(
    NotifyUrl,
  )}&ReturnURL=${encodeURIComponent(ReturnUrl)}&ItemDesc=${encodeURIComponent(
    order.ItemDesc,
  )}&Email=${encodeURIComponent(order.Email)}`;
}
// 對應文件 P17
// MerchantID=MS12345678&TimeStamp=1663040304&Version=2.0&RespondType=Stri
// ng&MerchantOrderNo=Vanespl_ec_1663040304&Amt=30&NotifyURL=https%3A%2F%2
// Fwebhook.site%2Fd4db5ad1-2278-466a-9d66-
// 78585c0dbadb&ReturnURL=&ItemDesc=test


// 對應文件 P17：使用 aes 加密
// $edata1=bin2hex(openssl_encrypt($data1, "AES-256-CBC", $key, OPENSSL_RAW_DATA, $iv));
function createSesEncrypt(TradeInfo) {
  const encrypt = crypto.createCipheriv('aes-256-cbc', HASHKEY, HASHIV);
  const enc = encrypt.update(genDataChain(TradeInfo), 'utf8', 'hex');
  return enc + encrypt.final('hex');
}

// 對應文件 P18：使用 sha256 加密
// $hashs="HashKey=".$key."&".$edata1."&HashIV=".$iv;
function createShaEncrypt(aesEncrypt) {
  const sha = crypto.createHash('sha256');
  const plainText = `HashKey=${HASHKEY}&${aesEncrypt}&HashIV=${HASHIV}`;

  return sha.update(plainText).digest('hex').toUpperCase();
}

// 對應文件 21, 22 頁：將 aes 解密
function createSesDecrypt(TradeInfo) {
  const decrypt = crypto.createDecipheriv('aes-256-cbc', HASHKEY, HASHIV);
  decrypt.setAutoPadding(false);
  const text = decrypt.update(TradeInfo, 'hex', 'utf8');
  const plainText = text + decrypt.final('utf8');
  const result = plainText.replace(/[\x00-\x20]+/g, '');
  return JSON.parse(result);
}

router.get('/env', (req, res) => {
  const envCheck = {
    MerchantID: process.env.MerchantID || '(undefined)',
    HASHKEY: process.env.HASHKEY ? '✅ loaded' : '❌ missing',
    HASHIV: process.env.HASHIV ? '✅ loaded' : '❌ missing',
    Version: process.env.Version,
    PayGateWay: process.env.PayGateWay,
    NotifyUrl: process.env.NotifyUrl,
    ReturnUrl: process.env.ReturnUrl,
  };
  console.log('🔍 Vercel env check:', envCheck);
  res.json(envCheck);
});

module.exports = router;
