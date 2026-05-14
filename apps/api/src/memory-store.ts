import {
  type ContactRecord,
  type TokenMetadataItem,
  type TransactionRecordItem,
  type WalletProfileRecord,
} from "@acorus/shared";
import type {
  AppStore,
  ContactCreateInput,
  ContactUpdateInput,
  TransactionCreateInput,
  TransactionStatusUpdateInput,
  UserRecord,
  WalletProfileCreateInput,
  WalletProfileUpdateInput,
} from "./store";
import { getCuratedTokenItems, toExplorerUrl } from "./store";

export class MemoryStore implements AppStore {
  private readonly users = new Map<string, UserRecord>();
  private readonly walletProfiles = new Map<string, WalletProfileRecord>();
  private readonly contacts = new Map<string, ContactRecord>();
  private readonly transactions = new Map<string, TransactionRecordItem>();

  async createAnonymousUser(): Promise<UserRecord> {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    return user;
  }

  async createWalletProfile(
    input: WalletProfileCreateInput,
  ): Promise<WalletProfileRecord> {
    const now = new Date().toISOString();
    const record: WalletProfileRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.name,
      type: input.type,
      publicAddress: input.publicAddress,
      chainFamily: input.chainFamily,
      hiddenBalance: input.hiddenBalance ?? false,
      preferredCurrency: input.preferredCurrency ?? "USD",
      createdAt: now,
      updatedAt: now,
    };

    this.walletProfiles.set(record.id, record);
    return record;
  }

  async listWalletProfiles(userId: string): Promise<WalletProfileRecord[]> {
    return [...this.walletProfiles.values()].filter((item) => item.userId === userId);
  }

  async updateWalletProfile(
    id: string,
    input: WalletProfileUpdateInput,
  ): Promise<WalletProfileRecord> {
    const current = this.walletProfiles.get(id);

    if (!current || current.userId !== input.userId) {
      throw new Error("Wallet profile not found.");
    }

    const next: WalletProfileRecord = {
      ...current,
      name: input.name ?? current.name,
      hiddenBalance: input.hiddenBalance ?? current.hiddenBalance,
      preferredCurrency: input.preferredCurrency ?? current.preferredCurrency,
      updatedAt: new Date().toISOString(),
    };

    this.walletProfiles.set(id, next);
    return next;
  }

  async deleteWalletProfile(id: string, userId: string): Promise<void> {
    const current = this.walletProfiles.get(id);

    if (!current || current.userId !== userId) {
      throw new Error("Wallet profile not found.");
    }

    this.walletProfiles.delete(id);
  }

  async createContact(input: ContactCreateInput): Promise<ContactRecord> {
    const now = new Date().toISOString();
    const record: ContactRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.name,
      address: input.address,
      chainFamily: input.chainFamily,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.contacts.set(record.id, record);
    return record;
  }

  async listContacts(userId: string): Promise<ContactRecord[]> {
    return [...this.contacts.values()].filter((item) => item.userId === userId);
  }

  async updateContact(id: string, input: ContactUpdateInput): Promise<ContactRecord> {
    const current = this.contacts.get(id);

    if (!current || current.userId !== input.userId) {
      throw new Error("Contact not found.");
    }

    const next: ContactRecord = {
      ...current,
      name: input.name,
      address: input.address,
      chainFamily: input.chainFamily,
      note: input.note ?? null,
      updatedAt: new Date().toISOString(),
    };

    this.contacts.set(id, next);
    return next;
  }

  async deleteContact(id: string, userId: string): Promise<void> {
    const current = this.contacts.get(id);

    if (!current || current.userId !== userId) {
      throw new Error("Contact not found.");
    }

    this.contacts.delete(id);
  }

  async createTransaction(
    input: TransactionCreateInput,
  ): Promise<TransactionRecordItem> {
    const now = new Date().toISOString();
    const record: TransactionRecordItem = {
      id: crypto.randomUUID(),
      userId: input.userId,
      walletProfileId: input.walletProfileId,
      chainId: input.chainId,
      hash: input.hash,
      from: input.from,
      to: input.to,
      assetType: input.assetType,
      tokenAddress: input.tokenAddress ?? null,
      symbol: input.symbol,
      amount: input.amount,
      status: input.status,
      direction: input.direction,
      submittedAt: input.submittedAt,
      confirmedAt: input.confirmedAt ?? null,
      rawStatus: input.rawStatus ?? null,
      explorerUrl: toExplorerUrl(input.chainId, input.hash),
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(record.id, record);
    return record;
  }

  async listTransactions(
    userId: string,
    walletProfileId?: string,
  ): Promise<TransactionRecordItem[]> {
    return [...this.transactions.values()].filter(
      (item) =>
        item.userId === userId &&
        (walletProfileId ? item.walletProfileId === walletProfileId : true),
    );
  }

  async getTransaction(id: string, userId: string): Promise<TransactionRecordItem> {
    const current = this.transactions.get(id);

    if (!current || current.userId !== userId) {
      throw new Error("Transaction not found.");
    }

    return current;
  }

  async updateTransactionStatus(
    id: string,
    userId: string,
    input: TransactionStatusUpdateInput,
  ): Promise<TransactionRecordItem> {
    const current = await this.getTransaction(id, userId);
    const next: TransactionRecordItem = {
      ...current,
      status: input.status,
      rawStatus: input.rawStatus ?? current.rawStatus,
      confirmedAt: input.confirmedAt ?? current.confirmedAt,
      updatedAt: new Date().toISOString(),
    };

    this.transactions.set(id, next);
    return next;
  }

  async getTokens(chainId: number): Promise<TokenMetadataItem[]> {
    return getCuratedTokenItems(chainId);
  }
}
