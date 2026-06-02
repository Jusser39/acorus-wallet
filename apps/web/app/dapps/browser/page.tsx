"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function DappBrowserContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url") || "";
  const name = searchParams.get("name") || "DApp Browser";
  
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!url) {
      router.push("/dapps");
    }
  }, [url, router]);

  if (!url) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Browser Chrome (Header) */}
      <div className="flex items-center gap-4 bg-slate-900 border-b border-slate-800 p-3 shrink-0">
        <Link href="/dapps" className="rounded-full hover:bg-slate-800 p-2 text-slate-400 transition">
          ✕
        </Link>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-1.5 w-full max-w-lg border border-slate-700/50">
            <span className="text-emerald-500 text-xs">🔒</span>
            <span className="text-slate-200 text-sm truncate flex-1 text-center">{new URL(url).hostname}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full hover:bg-slate-800 p-2 text-slate-400 transition tooltip-trigger" title="Open in external browser">
            ↗
          </a>
        </div>
      </div>

      {/* Warning if iframe blocks */}
      {loadError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-center">
          <p className="text-sm text-amber-500">
            This DApp might not allow loading inside a frame. 
            <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-semibold">Open in a new tab instead</a>.
          </p>
        </div>
      )}

      {/* Webview / Iframe */}
      <div className="flex-1 bg-white relative">
        {/* Simulate Acorus Web3 Provider Injection message */}
        <div className="absolute top-0 left-0 right-0 bg-fuchsia-600 text-white text-xs text-center py-1 font-semibold z-10 opacity-80 pointer-events-none">
          Acorus Web3 Provider Injected
        </div>
        
        <iframe
          src={url}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onError={() => setLoadError(true)}
          title={`DApp Browser - ${name}`}
        />
      </div>
    </div>
  );
}

export default function DappBrowserPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading browser...</div>}>
      <DappBrowserContent />
    </Suspense>
  );
}
