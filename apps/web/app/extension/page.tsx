import { ExtensionConnectLab } from "../../components/extension-connect-lab";

const DOWNLOAD_HREF = "/downloads/acorus-wallet-extension.zip";

export default function ExtensionPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-2xl">
        {/* Abstract background blobs */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-600/20 blur-3xl" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
            </span>
            Beta Release v0.1.0
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Web3 at your <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">fingertips</span>
          </h1>
          <p className="text-lg leading-8 text-slate-300">
            Seamlessly connect to dApps, manage multi-chain assets, and sign transactions with confidence. 
            Acorus Extension brings true self-custody and advanced security directly to your browser.
          </p>
          
          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <a className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-8 py-3.5 font-semibold text-white transition-all hover:scale-105 shadow-xl shadow-violet-900/20" href={DOWNLOAD_HREF} download>
              <span className="relative z-10 flex items-center gap-2">
                Download ZIP
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </a>
            <a className="inline-flex px-6 py-3 font-medium text-slate-300 hover:text-white transition-colors" href="/dapps">
              Explore supported dApps &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { title: "True Self-Custody", desc: "Your keys, your crypto. Encrypted locally on your device with industry-leading standards.", icon: "🔐" },
          { title: "Multi-Chain Ready", desc: "Native support for EVM, Solana, and Tron. Switch networks seamlessly without friction.", icon: "🌐" },
          { title: "Advanced Security", desc: "Detailed transaction simulations and scam detection before you sign anything.", icon: "🛡️" },
        ].map((feature, idx) => (
          <div key={idx} className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:bg-slate-800/80 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-6 text-slate-400">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Installation Steps */}
      <div className="rounded-[2.5rem] border border-slate-800 bg-slate-950 p-8 sm:p-12 shadow-2xl">
        <h2 className="mb-10 text-3xl font-bold text-white">How to install</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", title: "Download", desc: "Get the latest extension ZIP file from the button above and extract it on your computer." },
            { step: "02", title: "Open Settings", desc: "Type chrome://extensions in your Chrome browser address bar and hit enter." },
            { step: "03", title: "Enable Dev Mode", desc: "Toggle the 'Developer mode' switch in the top right corner of the extensions page." },
            { step: "04", title: "Load Unpacked", desc: "Click 'Load unpacked' and select the folder where you extracted the extension." },
          ].map((item, idx) => (
            <div key={idx} className="relative space-y-4">
              <div className="text-6xl font-black text-slate-800/30 tracking-tighter">{item.step}</div>
              <h4 className="text-lg font-bold text-white">{item.title}</h4>
              <p className="text-sm leading-6 text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lab component */}
      <div className="mt-8 space-y-8 rounded-[3rem] border border-slate-800 bg-slate-900/30 p-8 sm:p-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Connection Lab</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Test the extension bridge live. Our injected provider intercepts dApp requests and routes them to the Acorus Extension seamlessly. Use this environment to verify transaction signing and connection flows.
          </p>
        </div>
        <ExtensionConnectLab />
      </div>

    </section>
  );
}
