import {
  createDemoDappShellSnapshot,
  getDappConnectionTransportLabel,
  getDappPermissionDefinition,
  queueSessionRequestPreview,
  queueWalletConnectPairing,
  type QueueSessionRequestPreviewInput,
  type DappPermissionScope,
  type DappConnectionTransport,
  type DappSessionStatus,
  type DappShellSnapshot,
  type DappTrustLevel,
  type QueueWalletConnectPairingInput,
} from "@acorus/shared";

export function createWebDappShellPreview(): DappShellSnapshot {
  return createDemoDappShellSnapshot();
}

export function formatDappPermissionList(
  permissions: DappPermissionScope[],
): string {
  return permissions
    .map((permission) => getDappPermissionDefinition(permission).label)
    .join(", ");
}

export function getDappTrustLabel(level: DappTrustLevel): string {
  if (level === "trusted") return "Trusted preview";
  if (level === "warning") return "Review carefully";
  return "Unknown origin";
}

export function getDappTrustTone(level: DappTrustLevel): string {
  if (level === "trusted") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (level === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-slate-700 bg-slate-900/80 text-slate-200";
}

export function formatDappTransportLabel(
  transport: DappConnectionTransport,
): string {
  return getDappConnectionTransportLabel(transport);
}

export function getDappTransportTone(
  transport: DappConnectionTransport,
): string {
  if (transport === "walletconnect") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-100";
  }

  return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
}

export function getDappSessionTone(status: DappSessionStatus): string {
  if (status === "active") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
  if (status === "revoked") return "border-rose-500/30 bg-rose-500/10 text-rose-100";
  return "border-slate-700 bg-slate-900/80 text-slate-200";
}

export function queuePreviewWalletConnectPairing(
  snapshot: DappShellSnapshot,
  input: QueueWalletConnectPairingInput,
): DappShellSnapshot {
  return queueWalletConnectPairing(snapshot, input).snapshot;
}

export function queuePreviewSessionRequest(
  snapshot: DappShellSnapshot,
  input: QueueSessionRequestPreviewInput,
): DappShellSnapshot {
  return queueSessionRequestPreview(snapshot, input).snapshot;
}
