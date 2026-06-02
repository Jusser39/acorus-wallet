"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/store/wallet-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const bootstrapped = useWalletStore((state) => state.bootstrapped);

  useEffect(() => {
    if (bootstrapped && !unlockedVault) {
      router.push("/unlock");
    }
  }, [bootstrapped, unlockedVault, router]);

  if (!bootstrapped || !unlockedVault) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
