"use client";

import { useEffect, useState } from "react";
import { createDefaultAdapterRegistry, isValidSolanaAddress } from "@acorus/wallet-core";
import { getAddress, isAddress } from "viem";
import { formatAddress } from "@/lib/utils";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import type { ContactRecord } from "@acorus/shared";

const adapterRegistry = createDefaultAdapterRegistry();

export default function ContactsPage() {
  const userId = useWalletStore((state) => state.userId);
  const activeProfile = useActiveProfile();
  const [items, setItems] = useState<ContactRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshContacts(nextUserId: string) {
    setItems(await listContacts(nextUserId));
  }

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    void (async () => {
      const response = await listContacts(userId);

      if (active) {
        setItems(response);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  async function handleSubmit() {
    if (!userId || !name || !address) {
      setError("Укажите имя и адрес контакта.");
      return;
    }

    const chainFamily = activeProfile?.chainFamily ?? "evm";

    const isValidAddress =
      chainFamily === "solana"
        ? isValidSolanaAddress(address)
        : chainFamily === "tron"
          ? Boolean(adapterRegistry.get({ family: "tron", chainId: "tron-mainnet" })?.validateAddress(address))
          : isAddress(address);

    if (!isValidAddress) {
      setError(
        chainFamily === "solana"
          ? "Введите корректный Solana-адрес."
          : chainFamily === "tron"
            ? "Введите корректный Tron-адрес."
            : "Введите корректный EVM-адрес.",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedAddress =
      chainFamily === "evm" ? getAddress(address) : address.trim();

    try {
      if (editingId) {
        await updateContact(editingId, {
          userId,
          name,
          address: normalizedAddress,
          chainFamily,
          note: note || null,
        });
        setMessage("Контакт обновлен.");
      } else {
        await createContact({
          userId,
          name,
          address: normalizedAddress,
          chainFamily,
          note: note || null,
        });
        setMessage("Контакт добавлен.");
      }

      setEditingId(null);
      setName("");
      setAddress("");
      setNote("");
      await refreshContacts(userId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось сохранить контакт.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="panel space-y-4">
        <h1 className="text-3xl font-semibold">Contact book</h1>
        <p className="text-sm text-slate-600">
          Контакты сохраняются на backend как публичные адресные записи без seed/private key.
        </p>
        <label className="space-y-2">
          <span className="text-sm text-slate-600">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-600">Address</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={
              activeProfile?.chainFamily === "solana"
                ? "Base58 address"
                : activeProfile?.chainFamily === "tron"
                  ? "T..."
                  : "0x..."
            }
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-600">Note</span>
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <button
          type="button"
          className="button-primary"
          disabled={loading}
          onClick={() => void handleSubmit()}
        >
          {loading ? "Saving..." : editingId ? "Update contact" : "Add contact"}
        </button>
      </div>

      <div className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="panel flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatAddress(item.address)} · {item.chainFamily.toUpperCase()}
                </p>
                {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                     setEditingId(item.id);
                     setName(item.name);
                     setAddress(item.address);
                     setNote(item.note ?? "");
                     setMessage(null);
                     setError(null);
                   }}
                 >
                   Edit
                </button>
                <button
                  type="button"
                   className="button-secondary"
                   onClick={() =>
                     void deleteContact(item.id, item.userId).then(async () => {
                       setMessage("Контакт удален.");
                       await refreshContacts(item.userId);
                     })
                   }
                 >
                   Delete
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div className="panel text-sm text-slate-500">Контактов пока нет.</div>
        )}
      </div>
    </section>
  );
}
