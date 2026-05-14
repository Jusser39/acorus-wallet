"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRACTICE_LESSONS, PRACTICE_ADDRESS } from "@/lib/practice";
import { createWalletProfile } from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

export default function PracticePage() {
  const router = useRouter();
  const userId = useWalletStore((state) => state.userId);
  const activeProfile = useActiveProfile();
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);

  async function handleCreatePracticeWallet() {
    if (!userId) {
      return;
    }

    const profile = await createWalletProfile({
      userId,
      name: "Practice wallet",
      type: "practice",
      publicAddress: PRACTICE_ADDRESS,
      chainFamily: "evm",
    });

    upsertProfile(profile);
    setActiveProfileId(profile.id);
    router.push("/wallet");
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Practice wallet</h1>
          <p className="mt-2 text-sm text-sky-100">
            Practice mode — реальные деньги не используются. Настоящий private key и seed здесь не создаются.
          </p>
        </div>

        <div className="grid gap-3">
          {PRACTICE_LESSONS.map((lesson) => (
            <div key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="font-medium">{lesson.title}</p>
              <p className="mt-2 text-sm text-slate-300">{lesson.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-primary" onClick={() => void handleCreatePracticeWallet()}>
            Create practice wallet
          </button>
          <Link href="/send" className="button-secondary">
            Open fake send flow
          </Link>
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
