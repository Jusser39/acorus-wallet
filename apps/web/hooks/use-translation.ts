"use client";

import { useWalletStore } from "../store/wallet-store";
import { dictionaries } from "../lib/i18n/dictionaries";

export function useTranslation() {
  const preferredLanguage = useWalletStore((state) => state.preferredLanguage) || "en";

  const t = (key: string): string => {
    const dict = dictionaries[preferredLanguage] || dictionaries["en"];
    return dict?.[key] || dictionaries["en"]?.[key] || key;
  };

  return { t, language: preferredLanguage };
}
