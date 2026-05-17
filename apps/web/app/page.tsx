import Link from "next/link";
import { CapabilityStatusBoard } from "@/components/capability-status-board";

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14">
      <div className="max-w-3xl space-y-4">
        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
          PWA MVP · Non-custodial · Local encrypted vault
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Acorus Wallet
        </h1>
        <p className="text-lg text-slate-300">
          Создавайте, импортируйте и просматривайте кошельки без передачи seed
          phrase на backend. Архитектура строится как universal multichain wallet:
          EVM, Solana, Tron, Bitcoin/UTXO, TON и будущие сети через единый adapter layer.
        </p>
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
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/50 hover:bg-white/10"
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
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
