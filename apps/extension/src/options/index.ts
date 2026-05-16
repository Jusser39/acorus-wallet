import {
  EXTENSION_PHASES,
  createConnectedSitePermission,
} from "../shared/protocol";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Options root not found.");
}

const examplePermission = createConnectedSitePermission({
  origin: "https://app.example",
  accounts: ["0x0000000000000000000000000000000000000000"],
  chainIds: [1],
  methods: ["acorus_accounts", "acorus_chainId"],
});

root.innerHTML = `
  <main style="max-width:960px;margin:0 auto;padding:32px 20px 48px;display:flex;flex-direction:column;gap:20px">
    <section style="border:1px solid rgba(71,85,105,0.5);background:rgba(15,23,42,0.9);border-radius:28px;padding:24px">
      <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8">Acorus Extension</div>
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.15">Architecture skeleton only</h1>
      <p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.6">
        This options shell documents the permission model and extension phases before any live connection, signing, or transaction approval flow is enabled.
      </p>
    </section>

    <section style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
      <div style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
        <h2 style="margin:0 0 10px;font-size:20px">Permission model</h2>
        <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.5">
          Every future site connection must be origin-bound, account-scoped, chain-scoped, and method-scoped.
        </p>
        <pre style="margin:14px 0 0;padding:14px;border-radius:18px;background:#020617;color:#e2e8f0;font-size:12px;overflow:auto">${escapeHtml(JSON.stringify(examplePermission, null, 2))}</pre>
      </div>

      <div style="border:1px solid rgba(51,65,85,1);background:rgba(15,23,42,0.88);border-radius:24px;padding:20px">
        <h2 style="margin:0 0 10px;font-size:20px">Safety constraints</h2>
        <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:14px;line-height:1.7">
          <li>No private key in content scripts</li>
          <li>No seed in webpages</li>
          <li>No silent approvals</li>
          <li>No WalletConnect in this wave</li>
          <li>No transaction signing in this wave</li>
        </ul>
      </div>
    </section>

    <section style="display:grid;gap:12px">
      ${EXTENSION_PHASES.map(
        (phase, index) => `
          <div style="display:flex;justify-content:space-between;gap:12px;border:1px solid rgba(51,65,85,1);border-radius:20px;padding:16px;background:rgba(15,23,42,0.88)">
            <div>
              <div style="font-size:12px;color:#94a3b8">Phase ${index + 1}</div>
              <div style="margin-top:4px;font-weight:600;color:#fff">${phase}</div>
            </div>
            <span style="align-self:flex-start;border:1px solid rgba(250,204,21,0.35);background:rgba(250,204,21,0.12);color:#fde68a;border-radius:999px;padding:4px 8px;font-size:12px">Planned</span>
          </div>`,
      ).join("")}
    </section>
  </main>
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
