const DOWNLOAD_HREF = "/downloads/acorus-wallet-extension.zip";

export default function ExtensionPage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      
      {/* Hero Section */}
      <div className="app-surface subtle-grid relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 lg:p-16">
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
            </span>
            Beta Release v0.1.0
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Web3 at your <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">fingertips</span>
          </h1>
          <p className="text-lg leading-8 text-slate-600">
            Seamlessly connect to dApps, manage multi-chain assets, and sign transactions with confidence. 
            Acorus Extension brings true self-custody and advanced security directly to your browser.
          </p>
          
          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <a className="button-primary group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 font-semibold transition-all hover:scale-105" href={DOWNLOAD_HREF} download>
              <span className="relative z-10 flex items-center gap-2">
                Download ZIP
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </a>
            <a className="button-secondary inline-flex px-6 py-3.5" href="/dapps">
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
          <div key={idx} className="premium-card group relative overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1">
            <div className="relative z-10">
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Installation Steps */}
      <div className="premium-card rounded-[2.5rem] p-8 sm:p-12">
        <h2 className="mb-10 text-3xl font-bold text-slate-900">How to install</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", title: "Download", desc: "Get the latest extension ZIP file from the button above and extract it on your computer." },
            { step: "02", title: "Open Settings", desc: "Type chrome://extensions in your Chrome browser address bar and hit enter." },
            { step: "03", title: "Enable Dev Mode", desc: "Toggle the 'Developer mode' switch in the top right corner of the extensions page." },
            { step: "04", title: "Load Unpacked", desc: "Click 'Load unpacked' and select the folder where you extracted the extension." },
          ].map((item, idx) => (
            <div key={idx} className="relative space-y-4">
              <div className="text-6xl font-black text-slate-200 tracking-tighter">{item.step}</div>
              <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
              <p className="text-sm leading-6 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
