export function getCurrentUnixTime() {
  return Math.floor(Date.now() / 1000);
}

export function isQuoteExpired(expiry: number) {
  return expiry && expiry < getCurrentUnixTime();
}
