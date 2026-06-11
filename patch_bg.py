with open("apps/extension/src/background/index.ts", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update pendingProviderApprovals
old_pending = """const pendingProviderApprovals = new Map<
  string,
  {
    resolve: (response: ExtensionRuntimeResponse) => void;
  }
>();"""
new_pending = """const PROVIDER_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

const pendingProviderApprovals = new Map<
  string,
  {
    timeoutId: ReturnType<typeof setTimeout>;
    resolve: (response: ExtensionRuntimeResponse) => void;
  }
>();"""
code = code.replace(old_pending, new_pending)

# 2. Update isApprovalMethod
old_approval = """function isApprovalMethod(method: AcorusProviderMethod): boolean {
  return (
    method === "acorus_addChain"
    || method === "acorus_watchAsset"
    || method === "acorus_multichainSend"
    || method === "acorus_swap"
    || method === "acorus_signMessage"
    || method === "acorus_signTypedData"
    || method === "acorus_signTransaction"
    || method === "acorus_tonConnect"
    || method === "acorus_tonSendTransaction"
    || method === "acorus_tonDisconnect"
  );
}"""
new_approval = """function isApprovalMethod(method: AcorusProviderMethod): boolean {
  return (
    method === "acorus_addChain"
    || method === "acorus_watchAsset"
    || method === "acorus_multichainSend"
    || method === "acorus_swap"
    || method === "acorus_signMessage"
    || method === "acorus_signTypedData"
    || method === "acorus_signTransaction"
    || method === "acorus_sendTransaction"
    || method === "acorus_tonConnect"
    || method === "acorus_tonSendTransaction"
    || method === "acorus_tonDisconnect"
  );
}"""
code = code.replace(old_approval, new_approval)

# 3. Update waitForProviderApproval
old_wait = """function waitForProviderApproval(
  request: DappRequest,
): Promise<ExtensionRuntimeResponse> {
  return new Promise((resolve) => {
    pendingProviderApprovals.set(request.id, {
      resolve,
    });
  });
}"""
new_wait = """function waitForProviderApproval(
  request: DappRequest,
): Promise<ExtensionRuntimeResponse> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      pendingProviderApprovals.delete(request.id);
      pendingProviderExecutions.delete(request.id);
      pendingSignerUnlocks.delete(createSignerUnlockIntentId(request.id));

      resolve({
        requestId: request.id,
        ok: false,
        error: {
          code: "approval_timeout",
          message: "The Acorus Wallet request approval timed out.",
        },
      });
    }, PROVIDER_APPROVAL_TIMEOUT_MS);

    pendingProviderApprovals.set(request.id, {
      timeoutId,
      resolve,
    });
  });
}"""
code = code.replace(old_wait, new_wait)

# 4. Update resolvePendingConnectionApproval
old_resolve_conn = """function resolvePendingConnectionApproval(
  origin: string,
  proposalId: string,
  nextSnapshot: DappShellSnapshot,
): void {
  const bridge = createDappBridgeSessionView(nextSnapshot, origin);

  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin && pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: true,
      result: bridge.accounts,
    });
  }
}"""
new_resolve_conn = """function resolvePendingConnectionApproval(
  origin: string,
  proposalId: string,
  nextSnapshot: DappShellSnapshot,
): void {
  const bridge = createDappBridgeSessionView(nextSnapshot, origin);

  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin) {
      continue;
    }

    if (pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: true,
      result: bridge.accounts,
    });
  }
}"""
code = code.replace(old_resolve_conn, new_resolve_conn)

# 5. Update rejectPendingConnectionApproval
old_reject_conn = """function rejectPendingConnectionApproval(
  origin: string,
  proposalId: string,
  code: string,
  message: string,
): void {
  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin && pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: false,
      error: {
        code,
        message,
      },
    });
  }
}"""
new_reject_conn = """function rejectPendingConnectionApproval(
  origin: string,
  proposalId: string,
  code: string,
  message: string,
): void {
  for (const [requestId, pending] of pendingConnectionApprovals.entries()) {
    if (pending.origin !== origin) {
      continue;
    }

    if (pending.proposalId !== proposalId) {
      continue;
    }

    clearTimeout(pending.timeoutId);
    pendingConnectionApprovals.delete(requestId);
    pending.resolve({
      requestId,
      ok: false,
      error: {
        code,
        message,
      },
    });
  }
}"""
code = code.replace(old_reject_conn, new_reject_conn)

# 6. Update resolvePendingProviderApproval
old_resolve_prov = """function resolvePendingProviderApproval(
  request: DappRequest,
  result: unknown,
): void {
  const pending = pendingProviderApprovals.get(request.id);

  if (!pending) {
    return;
  }

  pendingProviderApprovals.delete(request.id);
  pending.resolve({
    requestId: request.id,
    ok: true,
    result,
  });
}"""
new_resolve_prov = """function resolvePendingProviderApproval(
  request: DappRequest,
  result: unknown,
): void {
  const pending = pendingProviderApprovals.get(request.id);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timeoutId);
  pendingProviderApprovals.delete(request.id);
  pending.resolve({
    requestId: request.id,
    ok: true,
    result,
  });
}"""
code = code.replace(old_resolve_prov, new_resolve_prov)

# 7. Update rejectPendingProviderApproval
old_reject_prov = """function rejectPendingProviderApproval(
  requestId: string,
  code: string,
  message: string,
): void {
  const pending = pendingProviderApprovals.get(requestId);

  if (!pending) {
    return;
  }

  pendingProviderApprovals.delete(requestId);
  pending.resolve({
    requestId,
    ok: false,
    error: {
      code,
      message,
    },
  });
}"""
new_reject_prov = """function rejectPendingProviderApproval(
  requestId: string,
  code: string,
  message: string,
): void {
  const pending = pendingProviderApprovals.get(requestId);

  if (!pending) {
    return;
  }

  clearTimeout(pending.timeoutId);
  pendingProviderApprovals.delete(requestId);
  pending.resolve({
    requestId,
    ok: false,
    error: {
      code,
      message,
    },
  });
}"""
code = code.replace(old_reject_prov, new_reject_prov)

# 8. Remove isTrustedAcorusAppOrigin function
old_trusted = """function isTrustedAcorusAppOrigin(origin: string): boolean {
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
}"""
code = code.replace(old_trusted, "")

# 9. Import isTrustedAcorusAppOrigin from @acorus/shared
old_import = """  type ChainFamily,
  type DappShellSnapshot,
} from "@acorus/shared";"""
new_import = """  type ChainFamily,
  type DappShellSnapshot,
  isTrustedAcorusAppOrigin,
} from "@acorus/shared";"""
code = code.replace(old_import, new_import)

with open("apps/extension/src/background/index.ts", "w", encoding="utf-8") as f:
    f.write(code)

print("Patch applied successfully.")
