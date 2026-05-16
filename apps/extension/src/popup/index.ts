import {
  EXTENSION_PHASES,
  createRequestId,
  createSkeletonState,
  type BackgroundStateSnapshot,
  type ExtensionRuntimeResponse,
} from "../shared/protocol";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Popup root not found.");
}

void loadPopupState();

async function loadPopupState(): Promise<void> {
  let state = createSkeletonState();

  try {
    const response = (await chrome.runtime.sendMessage({
      kind: "get_state",
      requestId: createRequestId("popup"),
      surface: "popup",
      origin: null,
    })) as ExtensionRuntimeResponse;

    if (response.ok && response.result) {
      state = response.result as BackgroundStateSnapshot;
    }
  } catch {
    state = createSkeletonState();
  }

  root.innerHTML = renderPopup(state);
}

function renderPopup(state: BackgroundStateSnapshot): string {
  const phases = EXTENSION_PHASES.map(
    (phase, index) => `
      <div style="display:flex;justify-content:space-between;gap:12px;border:1px solid rgba(51,65,85,1);border-radius:18px;padding:14px 16px;background:rgba(15,23,42,0.88)">
        <div>
          <div style="font-size:12px;color:#94a3b8">Phase ${index + 1}</div>
          <div style="font-weight:600;color:#fff;margin-top:4px">${phase}</div>
        </div>
        <span style="align-self:flex-start;border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.12);color:#bae6fd;border-radius:999px;padding:3px 8px;font-size:12px">Skeleton</span>
      </div>`,
  ).join("");

  return `
    <main style="padding:20px;display:flex;flex-direction:column;gap:16px">
      <section style="border:1px solid rgba(71,85,105,0.5);background:rgba(15,23,42,0.9);border-radius:24px;padding:18px">
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Acorus Wallet</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2">Chrome extension skeleton</h1>
        <p style="margin:10px 0 0;color:#cbd5e1;font-size:14px;line-height:1.5">
          The architecture shell exists in the repository, but live site connectivity, permissions, and signing remain disabled.
        </p>
      </section>

      <section style="display:grid;gap:12px">
        <div style="border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#d1fae5;border-radius:18px;padding:14px 16px;font-size:14px">
          Execution enabled: <strong>${String(state.executionEnabled)}</strong>
        </div>
        <div style="border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.12);color:#fde68a;border-radius:18px;padding:14px 16px;font-size:14px">
          Connected sites: <strong>${state.connectedSites.length}</strong>
        </div>
      </section>

      <section style="display:grid;gap:10px">
        ${phases}
      </section>
    </main>
  `;
}
