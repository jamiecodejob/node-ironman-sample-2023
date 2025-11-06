import { handleNotify } from "../lib/newebpayHandler.js";

export default async function handler(req, res) {
  try {
    const data = handleNotify(req.body);
    res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    res.status(400).send("Error");
  }
}
