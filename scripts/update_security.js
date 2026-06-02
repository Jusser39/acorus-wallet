const fs = require('fs');

let content = fs.readFileSync('apps/web/app/security/page.tsx', 'utf-8');

// Imports and Auth hook
content = content.replace(
  `import { useState } from "react";\nimport { useRouter } from "next/navigation";\nimport { useWalletStore } from "@/store/wallet-store";`,
  `import { useState, useEffect } from "react";\nimport { useRouter } from "next/navigation";\nimport { useWalletStore } from "@/store/wallet-store";`
);

const componentStart = `export default function SecurityPage() {\n  const router = useRouter();\n  const lockWallet = useWalletStore((state) => state.lockWallet);`;
const componentStartReplacement = `export default function SecurityPage() {\n  const router = useRouter();\n  const lockWallet = useWalletStore((state) => state.lockWallet);\n  const unlockedVault = useWalletStore((state) => state.unlockedVault);\n  const bootstrapped = useWalletStore((state) => state.bootstrapped);\n\n  useEffect(() => {\n    if (bootstrapped && !unlockedVault) {\n      router.push("/unlock");\n    }\n  }, [bootstrapped, unlockedVault, router]);\n\n  if (!bootstrapped || !unlockedVault) {\n    return null;\n  }`;
content = content.replace(componentStart, componentStartReplacement);

// Colors replacements
content = content.replace(/text-white/g, "text-slate-900");
content = content.replace(/text-slate-200/g, "text-slate-800");
content = content.replace(/text-slate-300/g, "text-slate-600");
content = content.replace(/text-slate-400/g, "text-slate-500");
content = content.replace(/text-slate-500/g, "text-slate-500");

// backgrounds and borders
content = content.replace(/border-slate-800/g, "border-white/60");
content = content.replace(/bg-slate-900\/80/g, "bg-white/40 backdrop-blur-2xl");
content = content.replace(/bg-slate-950/g, "bg-white/60");
content = content.replace(/bg-slate-800\/50/g, "bg-white/50");
content = content.replace(/bg-slate-800/g, "bg-white/80");
content = content.replace(/border-slate-700/g, "border-white/50");
content = content.replace(/hover:bg-slate-800/g, "hover:bg-white/70");
content = content.replace(/hover:bg-slate-700/g, "hover:bg-white/90");
content = content.replace(/bg-slate-700/g, "bg-slate-200");
content = content.replace(/hover:bg-slate-600/g, "hover:bg-slate-300");

// badges and specific colors
content = content.replace(/text-emerald-200/g, "text-emerald-700");
content = content.replace(/text-emerald-300/g, "text-emerald-700");
content = content.replace(/text-emerald-400/g, "text-emerald-700");
content = content.replace(/bg-slate-900/g, "bg-white/40"); // just in case

// Scanner banner
content = content.replace(/bg-gradient-to-r from-fuchsia-900\/40 to-blue-900\/40/g, "glass-panel bg-gradient-to-r from-white/60 to-white/40");
content = content.replace(/border-fuchsia-500\/30/g, "border-white/60");

fs.writeFileSync('apps/web/app/security/page.tsx', content, 'utf-8');
console.log('security/page.tsx updated');
