"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRACTICE_LESSONS, getPracticeAddress } from "@/lib/practice";
import { createWalletProfile, getOnboardingProgress, setOnboardingProgress } from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

export default function PracticePage() {
  const router = useRouter();
  const userId = useWalletStore((state) => state.userId);
  const activeProfile = useActiveProfile();
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const [chainFamily, setChainFamily] = useState<"evm" | "solana">("evm");
  const [progressCount, setProgressCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void getOnboardingProgress(userId)
      .then((items) => setProgressCount(items.filter((item) => item.completed).length))
      .catch(() => setProgressCount(0));
  }, [userId]);

  async function handleCreatePracticeWallet() {
    if (!userId) {
      return;
    }

    setLoading(true);

    try {
      const profile = await createWalletProfile({
        userId,
        name: chainFamily === "solana" ? "Practice Solana wallet" : "Practice wallet",
        type: "practice",
        publicAddress: getPracticeAddress(chainFamily),
        chainFamily,
      });

      await setOnboardingProgress({
        userId,
        step: "practice_wallet_created",
        completed: true,
      }).catch(() => undefined);

      upsertProfile(profile);
      setActiveProfileId(profile.id);
      setProgressCount((current) => Math.max(current, 1));
      router.push("/wallet");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Practice wallet</h1>
          <p className="mt-2 text-sm text-sky-100">
            Practice mode — реальные деньги не используются. Настоящий private key и seed здесь не создаются.
          </p>
          <p className="mt-3 text-sm text-slate-300">
            Completed onboarding steps: {progressCount}
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Chain family</span>
          <select
            value={chainFamily}
            onChange={(event) => setChainFamily(event.target.value as "evm" | "solana")}
          >
            <option value="evm">EVM</option>
            <option value="solana">Solana</option>
          </select>
        </label>

        <div className="grid gap-3">
          {PRACTICE_LESSONS.map((lesson) => (
            <div key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-medium">{lesson.title}</p>
              <p className="mt-2 text-sm text-slate-300">{lesson.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button-primary"
            disabled={loading}
            onClick={() => void handleCreatePracticeWallet()}
          >
            {loading ? "Creating..." : "Create practice wallet"}
          </button>
          {chainFamily === "evm" ? (
            <Link href="/send" className="button-secondary">
              Open fake send flow
            </Link>
          ) : (
            <Link href="/wallet" className="button-secondary">
              Open Solana practice portfolio
            </Link>
          )}
        </div>
      </div>

      <aside className="panel space-y-4">
        <h2 className="text-xl font-semibold">Why it matters</h2>
        <ul className="space-y-3 text-sm text-slate-300">
          <li>Можно изучить, что такое gas и native token, не рискуя средствами.</li>
          <li>Fake transactions идут в local/public history как учебные записи.</li>
          <li>View-only и practice mode подходят для onboarding и демо.</li>
        </ul>
        {activeProfile?.type === "practice" ? (
          <Link href="/wallet" className="button-secondary inline-flex">
            Open current practice wallet
          </Link>
        ) : null}
      </aside>
    </section>
  );
}
