import {
  type ContactRecord,
  type TokenMetadataItem,
  type TransactionRecordItem,
  type WalletProfileRecord,
} from "@acorus/shared";
import type {
  ApiChainRecord,
  AppStore,
  ContactCreateInput,
  ContactUpdateInput,
  CreateUserTokenInput,
  FiatCurrency,
  GetMarketChartInput,
  GetMarketPricesInput,
  MarketChartDto,
  MarketPriceDto,
  OnboardingProgressRecord,
  TransactionCreateInput,
  TransactionStatusUpdateInput,
  UserRecord,
  UserTokenDto,
  WalletProfileCreateInput,
  WalletProfileUpdateInput,
} from "./store";
import { getChainsResponse, getCuratedTokenItems, toExplorerUrl } from "./store";

export class MemoryStore implements AppStore {
  private readonly users = new Map<string, UserRecord>();
  private readonly walletProfiles = new Map<string, WalletProfileRecord>();
  private readonly contacts = new Map<string, ContactRecord>();
  private readonly transactions = new Map<string, TransactionRecordItem>();
  private readonly onboarding = new Map<string, OnboardingProgressRecord>();
  private readonly userTokens = new Map<string, UserTokenDto>();
  private readonly marketPrices = new Map<string, MarketPriceDto>();
  private readonly marketCharts = new Map<string, MarketChartDto>();

  async close(): Promise<void> {
    return;
  }

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
    return [...this.walletProfiles.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
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

    for (const [txId, transaction] of this.transactions.entries()) {
      if (transaction.walletProfileId === id) {
        this.transactions.delete(txId);
      }
    }
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
    return [...this.contacts.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
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
      status: input.status ?? "pending",
      direction: input.direction,
      submittedAt: input.submittedAt ?? now,
      confirmedAt: input.confirmedAt ?? null,
      rawStatus: input.rawStatus ?? null,
      explorerUrl: input.hash.startsWith("0x") ? toExplorerUrl(input.chainId, input.hash) : null,
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
    return [...this.transactions.values()]
      .filter(
        (item) =>
          item.userId === userId &&
          (walletProfileId ? item.walletProfileId === walletProfileId : true),
      )
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
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

  async listChains(): Promise<ApiChainRecord[]> {
    return getChainsResponse();
  }

  async listTokens(chainId?: number): Promise<TokenMetadataItem[]> {
    return getCuratedTokenItems(chainId);
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingProgressRecord[]> {
    return [...this.onboarding.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async setOnboardingProgress(
    userId: string,
    step: string,
    completed: boolean,
  ): Promise<OnboardingProgressRecord> {
    const key = `${userId}:${step}`;
    const current = this.onboarding.get(key);
    const now = new Date().toISOString();
    const record: OnboardingProgressRecord = current
      ? {
          ...current,
          completed,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          userId,
          step,
          completed,
          createdAt: now,
          updatedAt: now,
        };

    this.onboarding.set(key, record);
    return record;
  }

  async listUserTokens(userId: string, walletProfileId?: string): Promise<UserTokenDto[]> {
    return [...this.userTokens.values()].filter(
      (item) =>
        item.userId === userId &&
        (walletProfileId == null || item.walletProfileId === walletProfileId),
    );
  }

  async createUserToken(input: CreateUserTokenInput): Promise<UserTokenDto> {
    const now = new Date().toISOString();
    const record: UserTokenDto = {
      id: crypto.randomUUID(),
      userId: input.userId,
      walletProfileId: input.walletProfileId ?? null,
      chainId: input.chainId,
      tokenAddress: input.tokenAddress,
      symbol: input.symbol,
      name: input.name,
      decimals: input.decimals,
      logoUrl: input.logoUrl ?? null,
      isVerified: input.isVerified ?? false,
      isCustom: input.isCustom ?? true,
      isHidden: input.isHidden ?? false,
      sourceStatus: input.sourceStatus ?? null,
      liquidityUsd: input.liquidityUsd ?? null,
      volume24hUsd: input.volume24hUsd ?? null,
      marketCapUsd: input.marketCapUsd ?? null,
      fdvUsd: input.fdvUsd ?? null,
      pairUrl: input.pairUrl ?? null,
      riskLevel: input.riskLevel ?? null,
      riskFlagsJson: input.riskFlagsJson ?? null,
      lastMarketSyncAt: input.sourceStatus ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    this.userTokens.set(record.id, record);
    return record;
  }

  async updateUserTokenVisibility(id: string, isHidden: boolean): Promise<UserTokenDto> {
    const current = this.userTokens.get(id);
    if (!current) throw new Error("User token not found.");
    const updated = { ...current, isHidden, updatedAt: new Date().toISOString() };
    this.userTokens.set(id, updated);
    return updated;
  }

  async deleteUserToken(id: string): Promise<void> {
    this.userTokens.delete(id);
  }

  async getMarketPrices(input: GetMarketPricesInput): Promise<MarketPriceDto[]> {
    return [...this.marketPrices.values()].filter(
      (item) =>
        item.chainId === input.chainId &&
        item.currency === input.currency &&
        (input.symbols == null ||
          input.symbols.length === 0 ||
          input.symbols.includes(item.symbol)),
    );
  }

  async upsertMarketPrice(input: MarketPriceDto): Promise<MarketPriceDto> {
    const key = `${input.chainId}:${input.tokenAddress ?? ""}:${input.symbol}:${input.currency}`;
    this.marketPrices.set(key, input);
    return input;
  }

  async getMarketChart(input: GetMarketChartInput): Promise<MarketChartDto | null> {
    const key = `${input.chainId}:${input.tokenAddress ?? ""}:${input.symbol}:${input.currency}:${input.range}`;
    return this.marketCharts.get(key) ?? null;
  }

  async upsertMarketChart(input: MarketChartDto): Promise<MarketChartDto> {
    const key = `${input.chainId}:${input.tokenAddress ?? ""}:${input.symbol}:${input.currency}:${input.range}`;
    this.marketCharts.set(key, input);
    return input;
  }
}
