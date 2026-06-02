import { ContractScanner } from "@/components/security/contract-scanner";
import Link from "next/link";

export const metadata = {
  title: "Security Scanner - Acorus Wallet",
};

export default function SecurityScannerPage() {
  return (
    <section className="page space-y-6 pb-20">
      <div className="glass-panel space-y-3 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl -z-10"></div>

        <Link href="/security" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition mb-2">
          ← Back to Security Center
        </Link>
        <h1 className="text-3xl font-semibold text-white">
          Active Threat Scanner
        </h1>
        <p className="text-sm text-slate-300 max-w-xl">
          Enter a token or smart contract address to run a comprehensive risk analysis before interacting with it.
        </p>
      </div>

      <ContractScanner />
    </section>
  );
}
