import type { Metadata } from "next";
import "./globals.css";
import { AppBootstrap } from "@/components/app-bootstrap";
import { WalletNav } from "@/components/wallet-nav";

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
      <body className="min-h-full bg-slate-950 text-white">
        <AppBootstrap />
        <div className="flex min-h-full flex-col">
          <WalletNav />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
