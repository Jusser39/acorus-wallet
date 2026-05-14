"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPracticeTransaction,
  estimateErc20TransferGas,
  estimateNativeTransferGas,
  sendErc20Transaction,
  sendNativeTransaction,
} from "@acorus/wallet-core";
import { EVM_CHAINS } from "@acorus/shared";
import { formatUnits, parseUnits } from "viem";
import { createTransaction, fetchContacts, fetchTokens } from "@/lib/api";
import { getPracticeTokens } from "@/lib/practice";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

type SendStage = "form" | "review" | "result";

export default function SendPage() {
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const safetyMode = useWalletStore((state) => state.safetyMode);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [tokens, setTokens] = useState<Array<{ tokenAddress: string; symbol: string; name: string; decimals: number }>>([]);
  const [assetKey, setAssetKey] = useState("native");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [stage, setStage] = useState<SendStage>("form");
  const [resultHash, setResultHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void fetchContacts(userId)
      .then((items) => setContacts(items.map((item) => ({ id: item.id, name: item.name, address: item.address }))))
      .catch(() => setContacts([]));
  }, [userId]);

  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    let active = true;

    void (async () => {
      if (activeProfile.type === "practice") {
        if (active) {
          setTokens(
            getPracticeTokens(selectedChainId).map((token) => ({
              tokenAddress: token.tokenAddress,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
            })),
          );
        }
        return;
      }

      try {
        const items = await fetchTokens(selectedChainId);

        if (!active) {
          return;
        }

        setTokens(
          items.map((token) => ({
            tokenAddress: token.tokenAddress,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          })),
        );
      } catch {
        if (active) {
          setTokens([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [activeProfile, selectedChainId]);

  const chain = useMemo(
    () => EVM_CHAINS.find((item) => item.chainId === selectedChainId) ?? EVM_CHAINS[0]!,
    [selectedChainId],
  );
  const selectedToken = tokens.find((token) => token.tokenAddress === assetKey) ?? null;

  async function handleReview() {
    if (!activeProfile || !userId) {
      setError("Активный кошелек или user context не найдены.");
      return;
    }

    if (!recipient || !amount) {
      setError("Заполните адрес и сумму.");
      return;
    }

    if (activeProfile.type === "view_only") {
      setError("View-only wallet не может отправлять транзакции.");
      return;
    }

    if (activeProfile.type === "local" && !unlockedVault) {
      setError("Перед отправкой сначала выполните unlock.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeProfile.type === "practice") {
        setGasEstimate("Practice mode: simulated");
        setStage("review");
        return;
      }

      if (assetKey === "native") {
        const gas = await estimateNativeTransferGas({
          from: activeProfile.publicAddress as `0x${string}`,
          to: recipient as `0x${string}`,
          value: parseUnits(amount, 18),
          chainId: selectedChainId,
        });

        setGasEstimate(`${formatUnits(gas, 18)} ${chain.nativeSymbol}`);
      } else if (selectedToken) {
        const gas = await estimateErc20TransferGas({
          from: activeProfile.publicAddress as `0x${string}`,
          to: recipient as `0x${string}`,
          tokenAddress: selectedToken.tokenAddress as `0x${string}`,
          amountUnits: parseUnits(amount, selectedToken.decimals),
          chainId: selectedChainId,
        });

        setGasEstimate(`${formatUnits(gas, 18)} ${chain.nativeSymbol}`);
      }

      setStage("review");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось оценить gas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!activeProfile || !userId) {
      return;
    }

    if (activeProfile.type === "local" && (!unlockedVault || safetyMode)) {
      setError(
        safetyMode
          ? "Safety mode включен. Выключите его в Settings перед mainnet send."
          : "Перед отправкой сначала выполните unlock.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeProfile.type === "practice") {
        const fakeTx = createPracticeTransaction({
          symbol: assetKey === "native" ? chain.nativeSymbol : selectedToken?.symbol ?? "TOKEN",
          amount,
          to: recipient,
        });
        const record = await createTransaction({
          userId,
          walletProfileId: activeProfile.id,
          chainId: selectedChainId,
          hash: fakeTx.id,
          from: activeProfile.publicAddress,
          to: recipient,
          assetType: "practice",
          symbol: fakeTx.symbol,
          amount,
          status: "confirmed",
          direction: "out",
          submittedAt: fakeTx.createdAt,
          confirmedAt: fakeTx.createdAt,
        });

        setResultHash(record.hash);
        setStage("result");
        return;
      }

      const hash =
        assetKey === "native"
          ? await sendNativeTransaction({
              mnemonic: unlockedVault!.mnemonic,
              chainId: selectedChainId,
              to: recipient as `0x${string}`,
              amountWei: parseUnits(amount, 18),
            })
          : await sendErc20Transaction({
              mnemonic: unlockedVault!.mnemonic,
              chainId: selectedChainId,
              tokenAddress: selectedToken!.tokenAddress as `0x${string}`,
              to: recipient as `0x${string}`,
              amountUnits: parseUnits(amount, selectedToken!.decimals),
            });

      await createTransaction({
        userId,
        walletProfileId: activeProfile.id,
        chainId: selectedChainId,
        hash,
        from: activeProfile.publicAddress,
        to: recipient,
        assetType: assetKey === "native" ? "native" : "erc20",
        tokenAddress: assetKey === "native" ? null : selectedToken?.tokenAddress ?? null,
        symbol: assetKey === "native" ? chain.nativeSymbol : selectedToken?.symbol ?? "TOKEN",
        amount,
        status: "pending",
        direction: "out",
        submittedAt: new Date().toISOString(),
      });

      setResultHash(hash);
      setStage("result");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось отправить транзакцию.");
    } finally {
      setLoading(false);
    }
  }

  if (!activeProfile) {
    return (
      <section className="page">
        <div className="panel space-y-3">
          <h1 className="text-2xl font-semibold">Нет активного кошелька</h1>
          <Link href="/" className="button-primary inline-flex">
            Back to onboarding
          </Link>
        </div>
      </section>
    );
  }

  if (activeProfile.type === "view_only") {
    return (
      <section className="page">
        <div className="panel space-y-4">
          <h1 className="text-2xl font-semibold">View-only wallet</h1>
          <p className="text-sm text-slate-300">
            Отправка невозможна, потому что приватного ключа в этом профиле нет.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Send assets</h1>
          <p className="mt-2 text-sm text-slate-300">
            Перед отправкой проверяйте сеть, адрес и сумму. ERC-20 на неправильной сети может быть потерян.
          </p>
        </div>

        {activeProfile.type === "local" && !unlockedVault ? (
          <div className="warning-box space-y-3 text-sm">
            <p>Кошелек заблокирован. Отправка без unlock невозможна.</p>
            <Link href="/unlock" className="button-primary inline-flex">
              Unlock wallet
            </Link>
          </div>
        ) : null}

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Chain</span>
          <select
            value={selectedChainId}
            onChange={(event) => setSelectedChainId(Number(event.target.value))}
          >
            {EVM_CHAINS.map((item) => (
              <option key={item.chainId} value={item.chainId}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Asset</span>
          <select value={assetKey} onChange={(event) => setAssetKey(event.target.value)}>
            <option value="native">Native · {chain.nativeSymbol}</option>
            {tokens.map((token) => (
              <option key={token.tokenAddress} value={token.tokenAddress}>
                {token.symbol} · {token.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Recipient</span>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="0x..."
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Contact book</span>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) {
                setRecipient(event.target.value);
              }
            }}
          >
            <option value="">Select contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.address}>
                {contact.name} · {contact.address}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Amount</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-primary" disabled={loading} onClick={() => void handleReview()}>
            {loading ? "Preparing..." : "Review send"}
          </button>
          <button type="button" className="button-secondary" onClick={() => router.push("/wallet")}>
            Cancel
          </button>
        </div>
      </div>

      <aside className="panel space-y-5">
        <h2 className="text-xl font-semibold">Review</h2>
        <div className="space-y-3 text-sm text-slate-300">
          <p>Stage: {stage}</p>
          <p>Network: {chain.name}</p>
          <p>
            Asset: {assetKey === "native" ? chain.nativeSymbol : selectedToken?.symbol ?? "Token"}
          </p>
          <p>Recipient: {recipient || "—"}</p>
          <p>Amount: {amount || "—"}</p>
          <p>Estimated gas: {gasEstimate ?? "—"}</p>
        </div>

        {activeProfile.type === "local" ? (
          <div className="warning-box text-sm">
            Вы отправляете реальные средства. Проверьте сеть, адрес и сумму.
            {safetyMode ? " Safety mode сейчас включен и блокирует mainnet send." : ""}
          </div>
        ) : (
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
            Practice mode: отправка полностью симулируется.
          </div>
        )}

        <button
          type="button"
          className="button-primary w-full"
          disabled={stage !== "review" || loading}
          onClick={() => void handleSend()}
        >
          {loading ? "Sending..." : "Final confirm"}
        </button>

        {stage === "result" && resultHash ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-medium">Transaction submitted</p>
            <p className="mt-2 break-all">{resultHash}</p>
            <div className="mt-4 flex gap-3">
              <Link href="/history" className="button-secondary">
                Open history
              </Link>
              <Link href="/wallet" className="button-secondary">
                Back to wallet
              </Link>
            </div>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
