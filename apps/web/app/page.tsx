import Link from "next/link";
import { CapabilityStatusBoard } from "@/components/capability-status-board";
import { HomeSwapPanel } from "@/components/home-swap-panel";
import { TokenDiscoveryHero } from "@/components/token-discovery-hero";

export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <HomeSwapPanel />

      <TokenDiscoveryHero
        compact
        primaryHref="/explore"
        primaryLabel="Explore tokens"
        secondaryHref="/extension"
        secondaryLabel="Open extension"
      />

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
            className="premium-card p-6 transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {item.description}
            </p>
            <div className="mt-5 text-sm font-medium text-fuchsia-200">Open flow →</div>
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
            className="data-card rounded-2xl p-5 text-sm text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
