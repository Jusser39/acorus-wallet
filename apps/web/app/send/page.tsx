"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContactRecord, SendAsset, TransactionRecordItem } from "@acorus/shared";
import { EVM_CHAINS, getDefaultChainIdForFamily } from "@acorus/shared";
import {
  assertAddress,
  buildExplorerTxUrl,
  createPracticeTransaction,
  estimateErc20TransferFee,
  estimateNativeTransferFee,
  sendErc20Transaction,
  sendNativeTransaction,
} from "@acorus/wallet-core";
import { formatUnits, parseUnits } from "viem";
import {
  createTransaction,
  listContacts,
  updateTransactionStatus,
} from "@/lib/api";
import { loadWalletAssetSnapshot } from "@/lib/assets";
import { canWalletSend, isSafetyModeBlockingRealSend } from "@/lib/send-policy";
import { SendComposer } from "@/components/send-composer";
import { ExtensionWalletCard } from "@/components/extension-wallet-card";
import { GlassCard } from "@/components/glass-card";
import { formatAddress, formatAmount } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

type SendStage = "form" | "estimating" | "review" | "submitted" | "error";

type ReviewState = {
  asset: SendAsset;
  amountDisplay: string;
  recipient: string;
  estimatedFeeDisplay: string;
  estimatedFeeWei: bigint;
  gasLimit: bigint;
};

export default function SendPage() {
  const router = useRouter();
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const safetyMode = useWalletStore((state) => state.safetyMode);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [nativeBalance, setNativeBalance] = useState("0");
  const [nativeBalanceRaw, setNativeBalanceRaw] = useState(0n);
  const [tokens, setTokens] = useState<
    Array<{
      tokenAddress: string;
      symbol: string;
      name: string;
      decimals: number;
      balance: string;
      balanceRaw: bigint;
    }>
  >([]);
  const [assetKey, setAssetKey] = useState("native");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<SendStage>("form");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<TransactionRecordItem | null>(null);
  const [mainnetConfirmed, setMainnetConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const isSolanaProfile = activeProfile?.chainFamily === "solana";
  const evmSelectedChainId =
    typeof selectedChainId === "number"
    && EVM_CHAINS.some((item) => item.chainId === selectedChainId)
      ? selectedChainId
      : 1;

  const chain = useMemo(
    () => EVM_CHAINS.find((item) => item.chainId === evmSelectedChainId) ?? EVM_CHAINS[0]!,
    [evmSelectedChainId],
  );
  const selectedToken = tokens.find((token) => token.tokenAddress === assetKey) ?? null;
  const selectedAsset: SendAsset =
    assetKey === "native"
      ? {
          type: "native",
          chainId: evmSelectedChainId,
          symbol: chain.nativeSymbol,
          decimals: 18,
        }
      : {
          type: "erc20",
          chainId: evmSelectedChainId,
          symbol: selectedToken?.symbol ?? "TOKEN",
          tokenAddress: selectedToken?.tokenAddress ?? null,
          decimals: selectedToken?.decimals ?? 18,
        };
  const isUnlocked = Boolean(unlockedVault);
  const canSend = activeProfile
    ? !isSolanaProfile && canWalletSend(activeProfile.type, isUnlocked)
    : false;
  const safetyBlocked = activeProfile
    ? isSafetyModeBlockingRealSend(activeProfile.type, safetyMode)
    : false;
  const isNonEvmFamily =
    activeProfile?.chainFamily === "solana"
    || activeProfile?.chainFamily === "tron"
    || activeProfile?.chainFamily === "utxo"
    || activeProfile?.chainFamily === "ton";

  useEffect(() => {
    if (!userId) {
      return;
    }

    void listContacts(userId)
      .then((items) =>
        setContacts(
          items.filter((item) =>
            activeProfile ? item.chainFamily === activeProfile.chainFamily : true,
          ),
        ),
      )
      .catch(() => setContacts([]));
  }, [activeProfile, userId]);

  useEffect(() => {
    if (!activeProfile || isSolanaProfile) {
      return;
    }

    let active = true;

    void (async () => {
      await Promise.resolve();

      if (!active) {
        return;
      }

      setAssetsLoading(true);
      setError(null);

      try {
        const snapshot = await loadWalletAssetSnapshot(activeProfile, evmSelectedChainId);

        if (!active) {
          return;
        }

        setNativeBalance(snapshot.nativeBalance);
        setNativeBalanceRaw(snapshot.nativeBalanceRaw);
        setTokens(snapshot.tokens);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setTokens([]);
        setError(
          nextError instanceof Error ? nextError.message : "Не удалось загрузить балансы.",
        );
      } finally {
        if (active) {
          setAssetsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [activeProfile, isSolanaProfile, evmSelectedChainId]);

  useEffect(() => {
    if (assetKey !== "native" && !selectedToken) {
      const timer = window.setTimeout(() => setAssetKey("native"), 0);
      return () => window.clearTimeout(timer);
    }
  }, [assetKey, selectedToken]);

  function resetFlow() {
    setStage("form");
    setReview(null);
    setSubmittedRecord(null);
    setMainnetConfirmed(false);
    setError(null);
    setErrorDetails(null);
  }

  function setRecipientFromContact(contactId: string) {
    setSelectedContactId(contactId);
    const contact = contacts.find((item) => item.id === contactId);

    if (contact) {
      setRecipient(contact.address);
      resetFlow();
    }
  }

  function validateDraft() {
    if (!activeProfile || !userId) {
      throw new Error("Активный кошелек или пользовательский контекст не найдены.");
    }

    if (!canSend) {
      if (activeProfile.type === "view_only") {
        throw new Error("View-only wallet не может отправлять транзакции.");
      }

      throw new Error("Перед отправкой сначала разблокируйте кошелек.");
    }

    const normalizedRecipient = assertAddress(recipient.trim());

    if (!amount.trim()) {
      throw new Error("Введите сумму отправки.");
    }

    const amountUnits = parseUnits(amount, selectedAsset.decimals);

    if (amountUnits <= 0n) {
      throw new Error("Сумма должна быть больше нуля.");
    }

    if (selectedAsset.type === "native" && amountUnits > nativeBalanceRaw) {
      throw new Error("Недостаточно native balance для выбранной суммы.");
    }

    if (selectedAsset.type === "erc20") {
      if (!selectedToken || !selectedAsset.tokenAddress) {
        throw new Error("Выберите доступный ERC-20 актив.");
      }

      if (amountUnits > selectedToken.balanceRaw) {
        throw new Error("Недостаточно токенов для выбранной суммы.");
      }
    }

    return {
      activeProfile,
      userId,
      recipient: normalizedRecipient,
      amountUnits,
    };
  }

  async function handleUseMax() {
    if (!activeProfile) {
      return;
    }

    setError(null);
    setErrorDetails(null);

    try {
      if (selectedAsset.type === "erc20" && selectedToken) {
        setAmount(selectedToken.balance);
        resetFlow();
        return;
      }

      if (activeProfile.type === "practice") {
        setAmount(nativeBalance);
        resetFlow();
        return;
      }

      const recipientAddress = assertAddress(recipient.trim());
      const feeEstimate = await estimateNativeTransferFee({
        from: assertAddress(activeProfile.publicAddress),
        to: recipientAddress,
        value: 0n,
        chainId: evmSelectedChainId,
      });
      const maxWei = nativeBalanceRaw - feeEstimate.estimatedFeeWei;

      if (maxWei <= 0n) {
        throw new Error("Недостаточно native balance даже на network fee.");
      }

      setAmount(formatUnits(maxWei, 18));
      resetFlow();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось рассчитать безопасный Max для native token.",
      );
    }
  }

  async function handleReview() {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setStage("estimating");

    try {
      const draft = validateDraft();

      if (draft.activeProfile.type === "practice") {
        setReview({
          asset: selectedAsset,
          amountDisplay: amount,
          recipient: draft.recipient,
          estimatedFeeDisplay: "Practice mode · simulated",
          estimatedFeeWei: 0n,
          gasLimit: 0n,
        });
        setStage("review");
        return;
      }

      if (selectedAsset.type === "native") {
        const fee = await estimateNativeTransferFee({
          from: assertAddress(draft.activeProfile.publicAddress),
          to: draft.recipient,
          value: draft.amountUnits,
          chainId: evmSelectedChainId,
        });

        if (draft.amountUnits + fee.estimatedFeeWei > nativeBalanceRaw) {
          throw new Error("Недостаточно native balance с учетом network fee.");
        }

        setReview({
          asset: selectedAsset,
          amountDisplay: amount,
          recipient: draft.recipient,
          estimatedFeeDisplay: `${formatUnits(fee.estimatedFeeWei, 18)} ${chain.nativeSymbol}`,
          estimatedFeeWei: fee.estimatedFeeWei,
          gasLimit: fee.gasLimit,
        });
      } else {
        const fee = await estimateErc20TransferFee({
          from: assertAddress(draft.activeProfile.publicAddress),
          to: draft.recipient,
          tokenAddress: assertAddress(selectedAsset.tokenAddress ?? ""),
          amountUnits: draft.amountUnits,
          chainId: evmSelectedChainId,
        });

        if (fee.estimatedFeeWei > nativeBalanceRaw) {
          throw new Error("Недостаточно native balance для оплаты gas.");
        }

        setReview({
          asset: selectedAsset,
          amountDisplay: amount,
          recipient: draft.recipient,
          estimatedFeeDisplay: `${formatUnits(fee.estimatedFeeWei, 18)} ${chain.nativeSymbol}`,
          estimatedFeeWei: fee.estimatedFeeWei,
          gasLimit: fee.gasLimit,
        });
      }

      setStage("review");
    } catch (nextError) {
      setStage("error");
      setError(
        nextError instanceof Error ? nextError.message : "Не удалось подготовить review.",
      );
      setErrorDetails(nextError instanceof Error ? nextError.message : null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!review) {
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const draft = validateDraft();

      if (draft.activeProfile.type === "local") {
        if (safetyBlocked) {
          throw new Error(
            "Safety mode включен. Отключите его в Settings, чтобы разрешить реальный mainnet send.",
          );
        }

        if (!mainnetConfirmed) {
          throw new Error("Подтвердите, что понимаете отправку реальных средств.");
        }
      }

      if (draft.activeProfile.type === "practice") {
        const fakeTx = createPracticeTransaction({
          symbol: review.asset.symbol,
          amount,
          to: review.recipient,
        });
        const record = await createTransaction({
          userId: draft.userId,
          walletProfileId: draft.activeProfile.id,
          chainId: evmSelectedChainId,
          hash: fakeTx.id,
          from: draft.activeProfile.publicAddress,
          to: review.recipient,
          assetType: "practice",
          symbol: fakeTx.symbol,
          amount,
          status: "confirmed",
          direction: "out",
          submittedAt: fakeTx.createdAt,
          confirmedAt: fakeTx.createdAt,
        });

        setSubmittedRecord(record);
        setStage("submitted");
        return;
      }

      const hash =
        review.asset.type === "native"
          ? await sendNativeTransaction({
              mnemonic: unlockedVault!.mnemonic,
              chainId: evmSelectedChainId,
              to: review.recipient as `0x${string}`,
              amountWei: draft.amountUnits,
            })
          : await sendErc20Transaction({
              mnemonic: unlockedVault!.mnemonic,
              chainId: evmSelectedChainId,
              tokenAddress: review.asset.tokenAddress as `0x${string}`,
              to: review.recipient as `0x${string}`,
              amountUnits: draft.amountUnits,
            });

      const record = await createTransaction({
        userId: draft.userId,
        walletProfileId: draft.activeProfile.id,
        chainId: evmSelectedChainId,
        hash,
        from: draft.activeProfile.publicAddress,
        to: review.recipient,
        assetType: review.asset.type === "native" ? "native" : "erc20",
        tokenAddress: review.asset.type === "native" ? null : review.asset.tokenAddress ?? null,
        symbol: review.asset.symbol,
        amount,
        status: "pending",
        direction: "out",
        submittedAt: new Date().toISOString(),
      });

      setSubmittedRecord(record);
      setStage("submitted");
    } catch (nextError) {
      setStage("error");
      setError(
        nextError instanceof Error ? nextError.message : "Не удалось отправить транзакцию.",
      );
      setErrorDetails(nextError instanceof Error ? nextError.message : null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshSubmittedStatus() {
    if (!submittedRecord || !userId || submittedRecord.assetType === "practice") {
      return;
    }

    setLoading(true);

    try {
      const next = await updateTransactionStatus(submittedRecord.id, userId);
      setSubmittedRecord(next);
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

  if (isSolanaProfile || isNonEvmFamily) {
    return (
      <main className="magic-shell relative overflow-hidden px-4 py-8 min-h-screen">
        <div className="bg-blobs">
          <div className="blob blob-pink opacity-80" style={{ left: "5%", top: "10%", width: "500px", height: "500px" }}></div>
          <div className="blob blob-blue opacity-60" style={{ right: "5%", bottom: "10%", width: "600px", height: "600px" }}></div>
        </div>
        
        <section className="magic-container relative z-10 space-y-6 max-w-5xl mx-auto">
          <GlassCard glow className="p-6">
            <ExtensionWalletCard
              title="Extension send account"
              family={activeProfile.chainFamily}
              chainId={getDefaultChainIdForFamily(activeProfile.chainFamily)}
            />
            <div className="mt-6">
              <SendComposer
                profile={activeProfile}
                portfolio={null}
                initialFamily={activeProfile.chainFamily}
                initialChainId={getDefaultChainIdForFamily(activeProfile.chainFamily)}
                mnemonic={unlockedVault?.mnemonic ?? null}
              />
            </div>
          </GlassCard>
        </section>
      </main>
    );
  }

  return (
    <main className="magic-shell relative overflow-hidden px-4 py-8 min-h-screen">
      <div className="bg-blobs">
        <div className="blob blob-pink opacity-80" style={{ left: "5%", top: "10%", width: "500px", height: "500px" }}></div>
        <div className="blob blob-blue opacity-60" style={{ right: "5%", bottom: "10%", width: "600px", height: "600px" }}></div>
      </div>
      
      <section className="magic-container relative z-10 space-y-8 max-w-5xl mx-auto">
        <GlassCard glow className="p-6">
          {/* Universal Send Composer — Wave 5 execution layer */}
          <ExtensionWalletCard title="Extension send account" family="evm" chainId={evmSelectedChainId} />
          <div className="mt-6">
      <SendComposer
        profile={activeProfile}
        portfolio={null}
        initialFamily="evm"
        initialChainId={evmSelectedChainId}
        evmSendHref="#evm-send-form"
        mnemonic={unlockedVault?.mnemonic ?? null}
        onExecutionResult={async (result) => {
          if (result.status === "submitted" && result.txHash && userId && activeProfile) {
            try {
              await createTransaction({
                userId,
                walletProfileId: activeProfile.id,
                chainId: typeof result.chainId === "number" ? result.chainId : evmSelectedChainId,
                hash: result.txHash,
                from: activeProfile.publicAddress,
                to: "",
                assetType: "native",
                symbol: chain.nativeSymbol,
                amount: "0",
                status: "pending",
                direction: "out",
                submittedAt: result.submittedAt,
              });
            } catch {
              // tx record creation failure should not block the user flow
            }
          }
        }}
      />
          </div>
        </GlassCard>

        {/* EVM Send Form — real transaction broadcast */}
        <div id="evm-send-form" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="p-6 space-y-5">
          <div>
          <p className="text-sm uppercase tracking-[0.22em] text-emerald-600">EVM send · real transaction</p>
          <h2 className="mt-2 text-2xl font-semibold">Send assets</h2>
          <p className="mt-2 text-sm text-slate-600">
            Проверьте сеть, адрес и сумму. Транзакции в блокчейне нельзя отменить.
          </p>
        </div>

        {!canSend ? (
          <div className="warning-box space-y-3 text-sm">
            <p>
              {activeProfile.type === "view_only"
                ? "View-only wallet не может отправлять транзакции."
                : "Кошелек заблокирован. Перед отправкой сначала выполните unlock."}
            </p>
            {activeProfile.type === "local" ? (
              <Link href="/unlock" className="button-primary inline-flex">
                Unlock wallet
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-600">Chain</span>
            <select
              value={evmSelectedChainId}
              onChange={(event) => {
                setSelectedChainId(Number(event.target.value));
                resetFlow();
              }}
            >
              {EVM_CHAINS.map((item) => (
                <option key={item.chainId} value={item.chainId}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-600">Asset</span>
            <select
              value={assetKey}
              onChange={(event) => {
                setAssetKey(event.target.value);
                resetFlow();
              }}
            >
              <option value="native">
                Native · {chain.nativeSymbol} · {formatAmount(nativeBalance)}
              </option>
              {tokens.map((token) => (
                <option key={token.tokenAddress} value={token.tokenAddress}>
                  {token.symbol} · {formatAmount(token.balance)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Select contact</span>
          <select value={selectedContactId} onChange={(event) => setRecipientFromContact(event.target.value)}>
            <option value="">Choose contact</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} · {formatAddress(contact.address)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Recipient</span>
          <input
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setSelectedContactId("");
              resetFlow();
            }}
            placeholder="0x..."
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-2">
            <span className="text-sm text-slate-600">Amount</span>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                resetFlow();
              }}
            />
          </label>
          <button
            type="button"
            className="button-secondary"
            disabled={assetsLoading}
            onClick={() => void handleUseMax()}
          >
            Max
          </button>
        </div>

        <div className="send-review-box text-sm">
          <p>
            Available:{" "}
            {selectedAsset.type === "native"
              ? `${formatAmount(nativeBalance)} ${chain.nativeSymbol}`
              : `${formatAmount(selectedToken?.balance ?? "0")} ${selectedToken?.symbol ?? "TOKEN"}`}
          </p>
          {selectedAsset.type === "native" && activeProfile.type !== "practice" ? (
            <p className="mt-2 text-slate-500">
              Для native Max нужен корректный recipient, чтобы вычесть network fee.
            </p>
          ) : null}
        </div>

        {assetsLoading ? <p className="text-sm text-slate-500">Loading balances...</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button-primary"
            disabled={loading || assetsLoading || !canSend}
            onClick={() => void handleReview()}
          >
            {stage === "estimating" || loading ? "Estimating..." : "Review send"}
          </button>
          <button type="button" className="button-secondary" onClick={() => router.push("/wallet")}>
            Cancel
          </button>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-5">
          <h2 className="text-xl font-semibold">Review</h2>
        <div className="grid gap-3 text-sm text-slate-700">
          <div className="send-review-box">
            <p className="text-slate-500">Stage</p>
            <p className="mt-2 font-medium">{stage}</p>
          </div>
          <div className="send-review-box">
            <p className="text-slate-500">Network</p>
            <p className="mt-2 font-medium">{chain.name}</p>
          </div>
          <div className="send-review-box">
            <p className="text-slate-500">From</p>
            <p className="mt-2 font-medium break-all">{activeProfile.publicAddress}</p>
          </div>
          <div className="send-review-box">
            <p className="text-slate-500">To</p>
            <p className="mt-2 font-medium break-all">
              {(review?.recipient ?? recipient) || "—"}
            </p>
          </div>
          <div className="send-review-box">
            <p className="text-slate-500">Asset</p>
            <p className="mt-2 font-medium">
              {review?.asset.symbol ?? selectedAsset.symbol} ·{" "}
              {(review?.amountDisplay ?? amount) || "—"}
            </p>
          </div>
          <div className="send-review-box">
            <p className="text-slate-500">Estimated network fee</p>
            <p className="mt-2 font-medium">{review?.estimatedFeeDisplay ?? "—"}</p>
            {review?.gasLimit ? (
              <p className="mt-2 text-xs text-slate-500">Gas limit: {review.gasLimit.toString()}</p>
            ) : null}
          </div>
        </div>

        {activeProfile.type === "practice" ? (
          <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900">
            Practice mode: отправка полностью симулируется и не создаёт real-chain transaction.
          </div>
        ) : (
          <div className="warning-box text-sm">
            Проверьте сеть и адрес. Транзакции в блокчейне нельзя отменить.
            {safetyBlocked ? " Safety mode сейчас блокирует реальный send." : ""}
          </div>
        )}

        {activeProfile.type === "local" ? (
          <label className="send-review-box flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={mainnetConfirmed}
              onChange={(event) => setMainnetConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4"
              disabled={safetyBlocked}
            />
            <span>Я понимаю, что отправляю реальные средства в mainnet.</span>
          </label>
        ) : null}

        <button
          type="button"
          className="button-primary w-full"
          disabled={
            stage !== "review" ||
            loading ||
            (activeProfile.type === "local" && (safetyBlocked || !mainnetConfirmed))
          }
          onClick={() => void handleSend()}
        >
          {loading ? "Sending..." : "Final confirm"}
        </button>

        {stage === "submitted" && submittedRecord ? (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">Transaction submitted</p>
              <StatusBadge status={submittedRecord.status} />
            </div>
            <p className="mt-3 break-all">{submittedRecord.hash}</p>
            {submittedRecord.assetType !== "practice" ? (
              <Link
                href={submittedRecord.explorerUrl ?? buildExplorerTxUrl(evmSelectedChainId, submittedRecord.hash)}
                target="_blank"
                className="mt-3 inline-flex text-emerald-700 underline underline-offset-4"
              >
                Open explorer
              </Link>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {submittedRecord.assetType !== "practice" ? (
                <button
                  type="button"
                  className="button-secondary"
                  disabled={loading}
                  onClick={() => void handleRefreshSubmittedStatus()}
                >
                  Refresh status
                </button>
              ) : null}
              <Link href="/history" className="button-secondary">
                Open history
              </Link>
              <Link href="/wallet" className="button-secondary">
                Back to wallet
              </Link>
            </div>
          </div>
        ) : null}

        {stage === "error" && errorDetails ? (
          <details className="send-review-box text-sm">
            <summary className="cursor-pointer font-semibold text-slate-950">Error details</summary>
            <p className="mt-3 break-words">{errorDetails}</p>
          </details>
        ) : null}
        </GlassCard>
      </div>
    </section>
  </main>
  );
}
