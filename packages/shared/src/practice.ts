import type { PracticeLesson } from "./types";

export const PRACTICE_LESSONS: PracticeLesson[] = [
  {
    id: "seed-phrase",
    title: "Что такое seed phrase",
    description:
      "Seed phrase дает полный доступ к средствам. Никому ее не отправляйте и не храните в мессенджерах.",
  },
  {
    id: "gas",
    title: "Что такое gas",
    description:
      "Gas — это комиссия сети за выполнение транзакции. Она оплачивается нативной монетой сети.",
  },
  {
    id: "native-vs-token",
    title: "Native token и ERC-20",
    description:
      "ETH, BNB, MATIC — нативные монеты. USDT и USDC обычно работают как ERC-20 токены поверх сети.",
  },
  {
    id: "view-only",
    title: "Чем view-only отличается от обычного",
    description:
      "View-only кошелек позволяет смотреть балансы и историю, но не умеет подписывать и отправлять транзакции.",
  },
];
