"use client";

import { useEffect, useState } from "react";
import {
  createContact,
  deleteContact,
  fetchContacts,
  updateContact,
} from "@/lib/api";
import { useWalletStore } from "@/store/wallet-store";
import type { ContactRecord } from "@acorus/shared";

export default function ContactsPage() {
  const userId = useWalletStore((state) => state.userId);
  const [items, setItems] = useState<ContactRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    void (async () => {
      const response = await fetchContacts(userId);

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
      return;
    }

    if (editingId) {
      await updateContact(editingId, {
        userId,
        name,
        address,
        chainFamily: "evm",
        note: note || null,
      });
    } else {
      await createContact({
        userId,
        name,
        address,
        chainFamily: "evm",
        note: note || null,
      });
    }

    setEditingId(null);
    setName("");
    setAddress("");
    setNote("");
    setItems(await fetchContacts(userId));
  }

  return (
    <section className="page grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="panel space-y-4">
        <h1 className="text-3xl font-semibold">Contact book</h1>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Address</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Note</span>
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button type="button" className="button-primary" onClick={() => void handleSubmit()}>
          {editingId ? "Update contact" : "Add contact"}
        </button>
      </div>

      <div className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="panel flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-sm text-slate-300">{item.address}</p>
                {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
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
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    void deleteContact(item.id, item.userId).then(async () =>
                      setItems(await fetchContacts(item.userId)),
                    )
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="panel text-sm text-slate-400">Контактов пока нет.</div>
        )}
      </div>
    </section>
  );
}
