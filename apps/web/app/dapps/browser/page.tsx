"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useWeb3Bridge } from "@/hooks/use-web3-bridge";

function DappBrowserContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUrl = searchParams.get("url") || "";
  const name = searchParams.get("name") || "DApp Browser";
  
  const [url, setUrl] = useState(initialUrl);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize Web3 PostMessage bridge
  useWeb3Bridge(iframeRef);

  useEffect(() => {
    if (!initialUrl) {
      router.push("/dapps");
    } else {
      setUrl(initialUrl);
    }
  }, [initialUrl, router]);

  const handleReload = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      // Hack to reload cross-origin iframe
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = "about:blank";
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = currentSrc;
      }, 50);
    }
  };

  if (!initialUrl) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 bg-slate-900 rounded-t-3xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Browser Chrome (Header) */}
      <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 p-3 shrink-0 z-20 sticky top-0">
        <Link href="/dapps" className="rounded-full hover:bg-slate-800 p-2 text-slate-400 transition" title="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </Link>

        {/* Navigation Controls */}
        <div className="flex gap-1">
          <button className="rounded-full p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition disabled:opacity-50" title="Back" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <button className="rounded-full p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition disabled:opacity-50" title="Forward" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
          <button onClick={handleReload} className={`rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition ${isLoading ? "animate-spin text-sky-400" : ""}`} title="Reload">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex justify-center max-w-xl">
          <div className="flex items-center gap-2 bg-slate-950 rounded-full px-4 py-2 w-full border border-slate-800/80 shadow-inner group transition focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/50">
            <span className="text-emerald-400 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <span className="text-slate-300 font-medium text-sm truncate flex-1 text-center select-all cursor-text transition group-hover:text-white">
              {new URL(url).hostname}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full hover:bg-slate-800 p-2 text-slate-400 hover:text-white transition tooltip-trigger" title="Open in external browser">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/>
            </svg>
          </a>
          <button className="rounded-full hover:bg-slate-800 p-2 text-slate-400 hover:text-white transition" title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Warning if iframe blocks */}
      {loadError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <p className="text-sm text-amber-500">
            This DApp might not allow loading inside a frame. 
            <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 underline font-semibold hover:text-amber-400">Open in a new tab</a>.
          </p>
        </div>
      )}

      {/* Webview / Iframe */}
      <div className="flex-1 bg-white relative">
        {/* Simulate Acorus Web3 Provider Injection message */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700/50 text-sky-400 text-xs px-4 py-2 rounded-full font-semibold z-10 pointer-events-none shadow-xl flex items-center gap-2 animate-pulse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Acorus Provider Injected
        </div>
        
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setLoadError(true);
            setIsLoading(false);
          }}
          title={`DApp Browser - ${name}`}
        />
      </div>
    </div>
  );
}

export default function DappBrowserPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 flex items-center justify-center h-[50vh]"><div className="w-8 h-8 border-4 border-slate-300 border-t-sky-500 rounded-full animate-spin"></div></div>}>
      <DappBrowserContent />
    </Suspense>
  );
}
