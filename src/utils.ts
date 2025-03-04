import { MintQuoteResponse } from "@cashu/cashu-ts";

export function getCurrentUnixTime() {
  return Math.floor(Date.now() / 1000);
}

export function isQuoteExpired(res: MintQuoteResponse) {
  return res.expiry && res.expiry < getCurrentUnixTime();
}
