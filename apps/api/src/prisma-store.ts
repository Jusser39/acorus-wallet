import { PrismaClient } from "@prisma/client";
import type {
  ContactRecord,
  PreferredCurrency,
  TokenMetadataItem,
  TransactionRecordItem,
  WalletProfileRecord,
  WalletProfileType,
} from "@acorus/shared";
import type {
  ApiChainRecord,
  AppStore,
  ContactCreateInput,
  ContactUpdateInput,
  OnboardingProgressRecord,
  TransactionCreateInput,
  TransactionStatusUpdateInput,
  UserRecord,
  WalletProfileCreateInput,
  WalletProfileUpdateInput,
} from "./store";
import { getChainsResponse, getCuratedTokenItems, toExplorerUrl } from "./store";

type PrismaWalletProfileShape = {
  id: string;
  userId: string;
  name: string;
  type: string;
  publicAddress: string;
  chainFamily: "evm" | "solana" | "tron";
  hiddenBalance: boolean;
  preferredCurrency: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaContactShape = {
  id: string;
  userId: string;
  name: string;
  address: string;
  chainFamily: "evm" | "solana" | "tron";
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTransactionShape = {
  id: string;
  userId: string;
  walletProfileId: string;
  chainId: number;
  hash: string;
  from: string;
  to: string;
  assetType: "native" | "erc20" | "nft" | "practice";
  tokenAddress: string | null;
  symbol: string;
  amount: string;
  status: "pending" | "confirmed" | "failed" | "unknown";
  direction: "in" | "out" | "self";
  submittedAt: Date;
  confirmedAt: Date | null;
  rawStatus: string | null;
  explorerUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTokenShape = {
  id: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaOnboardingShape = {
  id: string;
  userId: string;
  step: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapWalletProfile(record: PrismaWalletProfileShape): WalletProfileRecord {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    type: record.type as WalletProfileType,
    publicAddress: record.publicAddress,
    chainFamily: record.chainFamily,
    hiddenBalance: record.hiddenBalance,
    preferredCurrency: record.preferredCurrency as PreferredCurrency,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapContact(record: PrismaContactShape): ContactRecord {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    address: record.address,
    chainFamily: record.chainFamily,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapTransaction(record: PrismaTransactionShape): TransactionRecordItem {
  return {
    id: record.id,
    userId: record.userId,
    walletProfileId: record.walletProfileId,
    chainId: record.chainId,
    hash: record.hash,
    from: record.from,
    to: record.to,
    assetType: record.assetType,
    tokenAddress: record.tokenAddress,
    symbol: record.symbol,
    amount: record.amount,
    status: record.status,
    direction: record.direction,
    submittedAt: record.submittedAt.toISOString(),
    confirmedAt: toIso(record.confirmedAt),
    rawStatus: record.rawStatus,
    explorerUrl: record.explorerUrl,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapToken(record: PrismaTokenShape): TokenMetadataItem {
  return {
    id: record.id,
    chainId: record.chainId,
    tokenAddress: record.tokenAddress,
    symbol: record.symbol,
    name: record.name,
    decimals: record.decimals,
    logoUrl: record.logoUrl,
    isVerified: record.isVerified,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapOnboarding(record: PrismaOnboardingShape): OnboardingProgressRecord {
  return {
    id: record.id,
    userId: record.userId,
    step: record.step,
    completed: record.completed,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class PrismaStore implements AppStore {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async createAnonymousUser(): Promise<UserRecord> {
    const user = await this.prisma.user.create({ data: {} });
    return {
      id: user.id,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async createWalletProfile(
    input: WalletProfileCreateInput,
  ): Promise<WalletProfileRecord> {
    const record = (await this.prisma.walletProfile.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        publicAddress: input.publicAddress,
        chainFamily: input.chainFamily,
        hiddenBalance: input.hiddenBalance ?? false,
        preferredCurrency: input.preferredCurrency ?? "USD",
      },
    })) as PrismaWalletProfileShape;

    return mapWalletProfile(record);
  }

  async listWalletProfiles(userId: string): Promise<WalletProfileRecord[]> {
    const records = (await this.prisma.walletProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })) as PrismaWalletProfileShape[];

    return records.map(mapWalletProfile);
  }

  async updateWalletProfile(
    id: string,
    input: WalletProfileUpdateInput,
  ): Promise<WalletProfileRecord> {
    const current = (await this.prisma.walletProfile.findUnique({
      where: { id },
    })) as PrismaWalletProfileShape | null;

    if (!current || current.userId !== input.userId) {
      throw new Error("Wallet profile not found.");
    }

    const record = (await this.prisma.walletProfile.update({
      where: { id },
      data: {
        name: input.name,
        hiddenBalance: input.hiddenBalance,
        preferredCurrency: input.preferredCurrency,
      },
    })) as PrismaWalletProfileShape;

    return mapWalletProfile(record);
  }

  async deleteWalletProfile(id: string, userId: string): Promise<void> {
    const current = (await this.prisma.walletProfile.findUnique({
      where: { id },
    })) as PrismaWalletProfileShape | null;

    if (!current || current.userId !== userId) {
      throw new Error("Wallet profile not found.");
    }

    await this.prisma.walletProfile.delete({
      where: { id },
    });
  }

  async createContact(input: ContactCreateInput): Promise<ContactRecord> {
    const record = (await this.prisma.contact.create({
      data: {
        userId: input.userId,
        name: input.name,
        address: input.address,
        chainFamily: input.chainFamily,
        note: input.note ?? null,
      },
    })) as PrismaContactShape;

    return mapContact(record);
  }

  async listContacts(userId: string): Promise<ContactRecord[]> {
    const records = (await this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })) as PrismaContactShape[];

    return records.map(mapContact);
  }

  async updateContact(id: string, input: ContactUpdateInput): Promise<ContactRecord> {
    const current = (await this.prisma.contact.findUnique({
      where: { id },
    })) as PrismaContactShape | null;

    if (!current || current.userId !== input.userId) {
      throw new Error("Contact not found.");
    }

    const record = (await this.prisma.contact.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address,
        chainFamily: input.chainFamily,
        note: input.note ?? null,
      },
    })) as PrismaContactShape;

    return mapContact(record);
  }

  async deleteContact(id: string, userId: string): Promise<void> {
    const current = (await this.prisma.contact.findUnique({
      where: { id },
    })) as PrismaContactShape | null;

    if (!current || current.userId !== userId) {
      throw new Error("Contact not found.");
    }

    await this.prisma.contact.delete({
      where: { id },
    });
  }

  async createTransaction(
    input: TransactionCreateInput,
  ): Promise<TransactionRecordItem> {
    const record = (await this.prisma.transactionRecord.create({
      data: {
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
        submittedAt: input.submittedAt ? new Date(input.submittedAt) : new Date(),
        confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : null,
        rawStatus: input.rawStatus ?? null,
        explorerUrl: input.hash.startsWith("0x") ? toExplorerUrl(input.chainId, input.hash) : null,
      },
    })) as PrismaTransactionShape;

    return mapTransaction(record);
  }

  async listTransactions(
    userId: string,
    walletProfileId?: string,
  ): Promise<TransactionRecordItem[]> {
    const records = (await this.prisma.transactionRecord.findMany({
      where: {
        userId,
        walletProfileId,
      },
      orderBy: { submittedAt: "desc" },
    })) as PrismaTransactionShape[];

    return records.map(mapTransaction);
  }

  async getTransaction(id: string, userId: string): Promise<TransactionRecordItem> {
    const record = (await this.prisma.transactionRecord.findUnique({
      where: { id },
    })) as PrismaTransactionShape | null;

    if (!record || record.userId !== userId) {
      throw new Error("Transaction not found.");
    }

    return mapTransaction(record);
  }

  async updateTransactionStatus(
    id: string,
    userId: string,
    input: TransactionStatusUpdateInput,
  ): Promise<TransactionRecordItem> {
    const current = (await this.prisma.transactionRecord.findUnique({
      where: { id },
    })) as PrismaTransactionShape | null;

    if (!current || current.userId !== userId) {
      throw new Error("Transaction not found.");
    }

    const record = (await this.prisma.transactionRecord.update({
      where: { id },
      data: {
        status: input.status,
        rawStatus: input.rawStatus,
        confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : null,
      },
    })) as PrismaTransactionShape;

    return mapTransaction(record);
  }

  async listChains(): Promise<ApiChainRecord[]> {
    return getChainsResponse();
  }

  async listTokens(chainId?: number): Promise<TokenMetadataItem[]> {
    const curated = getCuratedTokenItems(chainId);

    await Promise.all(
      curated.map((token) =>
        this.prisma.tokenMetadata.upsert({
          where: {
            chainId_tokenAddress: {
              chainId: token.chainId,
              tokenAddress: token.tokenAddress,
            },
          },
          create: {
            chainId: token.chainId,
            tokenAddress: token.tokenAddress,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoUrl: token.logoUrl,
            isVerified: token.isVerified,
          },
          update: {
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoUrl: token.logoUrl,
            isVerified: token.isVerified,
          },
        }),
      ),
    );

    const records = (await this.prisma.tokenMetadata.findMany({
      where: typeof chainId === "number" ? { chainId } : undefined,
      orderBy: [{ isVerified: "desc" }, { symbol: "asc" }],
    })) as PrismaTokenShape[];

    return records.map(mapToken);
  }

  async getOnboardingProgress(userId: string): Promise<OnboardingProgressRecord[]> {
    const records = (await this.prisma.onboardingProgress.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })) as PrismaOnboardingShape[];

    return records.map(mapOnboarding);
  }

  async setOnboardingProgress(
    userId: string,
    step: string,
    completed: boolean,
  ): Promise<OnboardingProgressRecord> {
    const record = (await this.prisma.onboardingProgress.upsert({
      where: {
        userId_step: {
          userId,
          step,
        },
      },
      update: {
        completed,
      },
      create: {
        userId,
        step,
        completed,
      },
    })) as PrismaOnboardingShape;

    return mapOnboarding(record);
  }
}
