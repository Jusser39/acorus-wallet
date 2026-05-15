import { getExplorerAddressUrl, getExplorerTxUrl } from "@acorus/shared";

export function buildExplorerAddressUrl(chainId: number, address: string): string {
  return getExplorerAddressUrl(chainId, address);
}

export function buildExplorerTxUrl(chainId: number, hash: string): string {
  return getExplorerTxUrl(chainId, hash);
}
