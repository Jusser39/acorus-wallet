import type { Metadata } from "next";
import "./globals.css";
import { AppBootstrap } from "@/components/app-bootstrap";
import { ExtensionProfileSync } from "@/components/extension-profile-sync";
import { WalletNav } from "@/components/wallet-nav";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Acorus Wallet",
  description: "Non-custodial universal multichain wallet with local encrypted vault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-[#fbf7ff] text-slate-950">
        <AppBootstrap />
        <ExtensionProfileSync />
        <div className="flex min-h-full flex-col">
          <WalletNav />
          <PageTransition>
            <main className="flex-1">{children}</main>
          </PageTransition>
        </div>
      </body>
    </html>
  );
}
