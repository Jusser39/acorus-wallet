const EXTENSION_PHASES = [
  "Manifest V3 extension shell",
  "Background service worker",
  "Content script bridge",
  "Live preview inpage provider",
  "Popup wallet UI",
  "Permission prompts",
  "Connected sites",
  "Permission queue shell",
  "EVM provider compatibility",
  "Universal account controls",
  "WalletConnect pairing shell",
];

export default function ExtensionPage() {
  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
          Chrome Extension
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Browser wallet preview bridge
        </h1>
        <p className="text-sm text-slate-300">
          Acorus Wallet now injects a browser bridge with common{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-100">
            window.ethereum
          </code>{" "}
          compatibility on top of the native Acorus methods. Connection
          approval, account listing, active chain reads, switch-chain prompts,
          and sign/transaction review requests can all flow through the
          extension after explicit approval. When the Acorus web app is open in
          the same browser profile, public local EVM wallet addresses can sync
          into the bridge without exposing seed phrase, passcode, or signing
          output. The bridge now defaults to one selected public account per
          site instead of exposing every synced address at once. The options
          shell can now queue preview-only WalletConnect pairings while
          redacting the imported symKey immediately. Real signatures, live
          WalletConnect relay, and broadcast remain disabled.
        </p>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        Websites can never reach mnemonic, private keys, passcode, real signing
        output, or transaction broadcast in this wave, even when they talk to
        the EVM-compatible provider surface. The new sync layer shares public
        approved EVM addresses only, and WalletConnect pairing secrets are
        redacted before they reach stored extension state.
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">Read + connect live</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-cyan-100">
            {[
              "acorus_requestAccounts",
              "acorus_accounts",
              "acorus_chainId",
              "acorus_switchChain",
              "eth_requestAccounts",
              "eth_accounts",
              "eth_chainId",
              "net_version",
              "eth_coinbase",
              "wallet_switchEthereumChain",
            ].map((method) => (
              <span
                key={method}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            The extension now speaks both its native Acorus provider contract
            and a familiar EVM wallet shape for connection, accounts, and chain
            metadata. Returned data now comes from approved session state, with
            wallet-backed public EVM addresses available after the Acorus web
            app syncs them into the extension. One selected public account is
            exposed by default for each approved site.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">
            Approval review live
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-violet-100">
            {[
              "acorus_signMessage",
              "acorus_signTypedData",
              "acorus_signTransaction",
              "acorus_sendTransaction",
              "personal_sign",
              "eth_signTypedData_v4",
              "eth_signTransaction",
              "eth_sendTransaction",
            ].map((method) => (
              <span
                key={method}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-300">
            These methods enter the extension request queue and resolve only
            after explicit approve or reject actions. Returned results still
            stay preview-only, so websites never receive real signature bytes
            or a broadcast transaction hash in this wave.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
          <h2 className="text-lg font-semibold text-white">
            WalletConnect preview shell
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Queue a pairing proposal from a pasted URI</li>
            <li>Redact symKey immediately and persist safe peer metadata only</li>
            <li>Review connected peers under the same account controls</li>
            <li>Keep live relay, signatures, and broadcast disabled</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-3">
        {EXTENSION_PHASES.map((phase, index) => (
          <div
            key={phase}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
          >
            <div>
              <div className="text-sm text-slate-400">
                Phase {index + 1}
              </div>
              <div className="font-semibold text-white">
                {phase}
              </div>
            </div>

            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300">
              {index < EXTENSION_PHASES.length ? "Preview" : "Planned"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
