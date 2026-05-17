import Link from "next/link";
import { CapabilityStatusBoard } from "@/components/capability-status-board";

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <div className="app-surface grid gap-6 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-sm text-teal-100">
            Universal multichain wallet
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Acorus Wallet
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              Создавайте, импортируйте и просматривайте кошельки без передачи seed
              phrase на backend. Архитектура строится как universal multichain wallet:
              EVM, Solana, Tron, Bitcoin/UTXO, TON и будущие сети через единый adapter layer.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create" className="button-primary inline-flex">
              Create wallet
            </Link>
            <Link href="/swap" className="button-secondary inline-flex">
              Open swap
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/44 p-4">
          {[
            ["EVM", "Ethereum, BNB, Polygon"],
            ["Solana", "NFTs, balances, swaps"],
            ["Tron", "Receive, contacts, dApp path"],
            ["UTXO + TON", "Capability matrix ready"],
          ].map(([title, description]) => (
            <div key={title} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div>
                <div className="font-semibold text-white">{title}</div>
                <div className="text-sm text-slate-400">{description}</div>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">
                multichain
              </span>
            </div>
          ))}
        </div>
      </div>

      <CapabilityStatusBoard />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/create",
            title: "Create wallet",
            description: "Новый EVM-кошелек с локальной seed phrase и passcode.",
          },
          {
            href: "/import",
            title: "Import wallet",
            description: "Импорт по seed phrase с локальным шифрованием vault.",
          },
          {
            href: "/view-only",
            title: "View-only wallet",
            description: "Просмотр балансов без приватного ключа и отправки.",
          },
          {
            href: "/practice",
            title: "Practice wallet",
            description: "Учебный режим без реальных средств и настоящего seed.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="app-surface rounded-[1.5rem] p-6 transition hover:-translate-y-0.5 hover:border-teal-200/35"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          "Seed phrase никогда не отправляется на сервер.",
          "Подпись и расшифровка выполняются только на клиенте.",
          "Каждая сеть проходит через единую capability matrix: live, preview, planned или blocked.",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
