const DOWNLOAD_HREF = "/downloads/acorus-wallet-extension.zip";

const LIVE_METHODS = [
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "net_version",
  "eth_coinbase",
  "wallet_getPermissions",
  "wallet_requestPermissions",
  "wallet_revokePermissions",
  "wallet_addEthereumChain",
  "wallet_switchEthereumChain",
  "wallet_watchAsset",
  "personal_sign",
  "eth_signTypedData_v4",
  "eth_signTransaction",
  "eth_sendTransaction",
];

const SHIPPED_ITEMS = [
  "Manifest V3 Chrome extension",
  "Injected window.ethereum provider",
  "Create/import encrypted extension vault",
  "Lock/unlock wallet session",
  "Per-site connect approval",
  "Connected sites and revoke controls",
  "EVM permissions API",
  "Add network approval",
  "Add/watch token approval",
  "Preview sign/send request queue",
  "WalletConnect pairing preview shell",
  "Packaged ZIP download artifact",
];

const BENCHMARK_ITEMS = [
  ["MetaMask", "window.ethereum, permissions, chain switching, add network, add token, sign/send prompts"],
  ["Trust Wallet", "multi-wallet, multi-chain, dApp access, swaps, NFTs, custom tokens/testnets"],
  ["Rabby", "100+ EVM networks, pre-transaction review, scam protection, approval manager"],
  ["Phantom", "browser extension, self-custody, multi-chain assets and NFT-first UX"],
];

const NEXT_ITEMS = [
  "Real EVM signing and broadcast after unlock",
  "Solana injected provider",
  "Tron provider bridge",
  "Transaction simulation and scam warnings",
  "Approval/token allowance manager",
  "Hardware-backed biometrics where browser allows it",
  "Chrome Web Store publishing package",
];

export default function ExtensionPage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <div className="app-surface grid gap-6 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-sm text-teal-100">
            Chrome extension wallet
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Acorus Wallet Extension
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              Основной кошелек теперь живет в расширении: seed phrase, encrypted
              vault, unlock state, dApp connect и approval prompts. Сайт
              подключается к расширению через injected provider, как в MetaMask,
              Trust Wallet и других production-кошельках.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="button-primary inline-flex" href={DOWNLOAD_HREF} download>
              Download extension ZIP
            </a>
            <a className="button-secondary inline-flex" href="/dapps">
              Test dApp bridge
            </a>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/44 p-4">
          <div className="text-sm font-semibold text-white">Install steps</div>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>1. Download ZIP and unpack it locally.</li>
            <li>2. Open <code className="rounded bg-black/30 px-1">chrome://extensions</code>.</li>
            <li>3. Enable Developer mode.</li>
            <li>4. Click Load unpacked and choose the unpacked folder.</li>
            <li>5. Open the Acorus popup and create or import the wallet.</li>
          </ol>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold text-white">Wallet core</h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            {SHIPPED_ITEMS.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold text-white">Provider methods</h2>
          <div className="flex flex-wrap gap-2">
            {LIVE_METHODS.map((method) => (
              <span
                key={method}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="text-sm leading-6 text-slate-300">
            Connect/account/chain reads are live through extension approval.
            Signature and transaction requests enter review mode; real signing
            remains gated until the next security-reviewed wave.
          </p>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold text-white">Next build wave</h2>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            {NEXT_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Competitor parity track</h2>
          <p className="text-sm leading-6 text-slate-300">
            Расширение строится как основной self-custody слой: сайт остается
            интерфейсом, а создание кошелька, unlock, connect и approval flow
            живут в Chrome extension.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {BENCHMARK_ITEMS.map(([name, details]) => (
            <div
              key={name}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-semibold text-white">{name}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{details}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="warning-box text-sm leading-6">
        Download artifact is generated by <code>pnpm extension:package</code>.
        The ZIP contains the unpacked Chrome extension build only. Seed phrase
        and private data are never included in the downloadable package.
      </div>
    </section>
  );
}
