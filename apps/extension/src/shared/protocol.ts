import type { ChainId } from "@acorus/shared";

export const ACORUS_INPAGE_REQUEST = "acorus:inpage-request";
export const ACORUS_INPAGE_RESPONSE = "acorus:inpage-response";

export type ExtensionSurface =
  | "background"
  | "content"
  | "inpage"
  | "popup"
  | "options";

export const ACORUS_PROVIDER_METHODS = [
  "acorus_ping",
  "acorus_requestAccounts",
  "acorus_accounts",
  "acorus_chainId",
  "acorus_switchChain",
] as const;

export type AcorusProviderMethod = (typeof ACORUS_PROVIDER_METHODS)[number];

export type PermissionMethod = Exclude<AcorusProviderMethod, "acorus_ping">;

export type ConnectedSitePermission = {
  origin: string;
  accounts: string[];
  chainIds: ChainId[];
  methods: PermissionMethod[];
  grantedAt: string;
  expiresAt?: string | null;
};

export type BackgroundStateSnapshot = {
  phase: "skeleton";
  providerInjection: "stub_only";
  executionEnabled: false;
  connectedSites: ConnectedSitePermission[];
  supportedMethods: readonly AcorusProviderMethod[];
  lastUpdatedAt: string;
  activeOrigin?: string | null;
};

export type ExtensionRuntimeMessage =
  | {
      kind: "ping";
      requestId: string;
      surface: ExtensionSurface;
    }
  | {
      kind: "get_state";
      requestId: string;
      surface: ExtensionSurface;
      origin?: string | null;
    }
  | {
      kind: "provider_request";
      requestId: string;
      surface: "content";
      origin: string;
      method: AcorusProviderMethod;
      params?: unknown[];
    };

export type ExtensionRuntimeResponse = {
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export type InpageRequestEnvelope = {
  type: typeof ACORUS_INPAGE_REQUEST;
  requestId: string;
  method: AcorusProviderMethod;
  params?: unknown[];
};

export type InpageResponseEnvelope = {
  type: typeof ACORUS_INPAGE_RESPONSE;
  requestId: string;
  ok: boolean;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
};

export const EXTENSION_PHASES = [
  "Manifest V3 shell",
  "Background message router",
  "Content-to-inpage bridge",
  "Stub provider exposure",
  "Popup and options shells",
  "Permission store types",
  "Connected sites UX later",
  "EVM compatibility later",
  "Solana compatibility later",
] as const;

export function createRequestId(prefix = "acorus"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function isAcorusProviderMethod(
  value: string,
): value is AcorusProviderMethod {
  return (ACORUS_PROVIDER_METHODS as readonly string[]).includes(value);
}

export function createConnectedSitePermission(input: {
  origin: string;
  accounts?: string[];
  chainIds?: ChainId[];
  methods?: PermissionMethod[];
}): ConnectedSitePermission {
  return {
    origin: input.origin,
    accounts: [...new Set(input.accounts ?? [])],
    chainIds: [...new Set(input.chainIds ?? [])],
    methods: [...new Set(input.methods ?? [])],
    grantedAt: new Date().toISOString(),
    expiresAt: null,
  };
}

export function createSkeletonState(input?: {
  activeOrigin?: string | null;
  connectedSites?: ConnectedSitePermission[];
}): BackgroundStateSnapshot {
  return {
    phase: "skeleton",
    providerInjection: "stub_only",
    executionEnabled: false,
    connectedSites: input?.connectedSites ?? [],
    supportedMethods: ACORUS_PROVIDER_METHODS,
    lastUpdatedAt: new Date().toISOString(),
    activeOrigin: input?.activeOrigin ?? null,
  };
}

export function isInpageRequestEnvelope(
  value: unknown,
): value is InpageRequestEnvelope {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<InpageRequestEnvelope>;
  return (
    candidate.type === ACORUS_INPAGE_REQUEST
    && typeof candidate.requestId === "string"
    && typeof candidate.method === "string"
    && isAcorusProviderMethod(candidate.method)
  );
}
