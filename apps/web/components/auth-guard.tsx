"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/store/wallet-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const isBootstrapped = useWalletStore((state) => state.isBootstrapped);

  useEffect(() => {
    if (isBootstrapped && !unlockedVault) {
      router.push("/unlock");
    }
  }, [isBootstrapped, unlockedVault, router]);

  if (!isBootstrapped || !unlockedVault) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
