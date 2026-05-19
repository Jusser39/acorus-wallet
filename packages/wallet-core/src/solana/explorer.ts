export function buildSolanaExplorerTxUrl(signature: string): string {
  return `https://solscan.io/tx/${encodeURIComponent(signature)}`;
}

export function buildSolanaExplorerAddressUrl(address: string): string {
  return `https://solscan.io/account/${encodeURIComponent(address)}`;
}
