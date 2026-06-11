export function isTrustedAcorusAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.origin === "http://85.239.59.199:8080"
      || url.origin === "http://24wallet.ru"
      || url.origin === "https://24wallet.ru"
      || url.origin === "http://www.24wallet.ru"
      || url.origin === "https://www.24wallet.ru"
      || url.origin === "http://localhost:3000"
      || url.origin === "http://127.0.0.1:3000"
      || url.origin === "http://localhost:3024"
      || url.origin === "http://127.0.0.1:3024"
    );
  } catch {
    return false;
  }
}
