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
  "Solana provider compatibility",
  "WalletConnect later",
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
          Acorus Wallet now injects a preview-backed browser bridge with common{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-100">
            window.ethereum
          </code>{" "}
          compatibility on top of the native Acorus methods. Connection
          approval, account listing, active chain reads, switch-chain prompts,
          and sign/transaction review requests can all flow through the
          extension after explicit approval. Real signatures, broadcast, and
          WalletConnect remain disabled.
        </p>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
        Current bridge mode is preview-backed only. Websites can never reach
        mnemonic, private keys, passcode, real signing output, or transaction
        broadcast in this wave, even when they talk to the EVM-compatible
        provider surface.
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
            metadata. Returned data still comes only from the approved
            preview-backed session state.
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
          <h2 className="text-lg font-semibold text-white">Still blocked</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Real signature material returned to websites</li>
            <li>Real transaction broadcast</li>
            <li>Wallet-backed account exposure</li>
            <li>Automatic chain addition</li>
            <li>WalletConnect pairing</li>
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
              {index < 9 ? "Preview" : "Planned"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
